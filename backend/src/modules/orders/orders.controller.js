const { Op } = require('sequelize');
const {
  sequelize,
  Order,
  OrderItem,
  Booking,
  TourBooking,
  CarRentalBooking,
  Tour,
  TourSchedule,
  Car,
  Room,
  RoomType,
  Customer,
  Payment,
  Notification,
} = require('../../models');
const { createError } = require('../../middlewares/errorHandler');

// Helper to generate unique order code: ORD-YYYYMMDD-XXXX
const generateOrderCode = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${rand}`;
};

// POST /api/checkout
const checkout = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      hotelBooking,
      hotelBookings = hotelBooking ? [hotelBooking] : [],
      tourBooking,
      tourBookings = tourBooking ? [tourBooking] : [],
      carRental,
      carRentals = carRental ? [carRental] : [],
      customerInfo = {},
      paymentMethod = 'BankTransfer',
    } = req.body;

    if (hotelBookings.length === 0 && tourBookings.length === 0 && carRentals.length === 0) {
      throw createError('Đơn hàng phải chứa ít nhất một dịch vụ (Khách sạn, Tour hoặc Thuê xe)', 400);
    }

    // 1. Identify or create customer
    let targetCustomerId = null;
    const guestEmail = customerInfo.email?.trim() || req.user?.email;
    const guestName = customerInfo.fullName?.trim() || customerInfo.name?.trim() || req.user?.full_name || 'Khách hàng LuxHome';
    const guestPhone = customerInfo.phone?.trim() || req.user?.phone || '';

    if (req.user) {
      const cust = await Customer.findOne({ where: { user_id: req.user.id }, transaction });
      if (cust) targetCustomerId = cust.id;
    }

    if (!targetCustomerId && guestEmail) {
      let cust = await Customer.findOne({ where: { email: guestEmail }, transaction });
      if (!cust) {
        cust = await Customer.create(
          {
            full_name: guestName,
            email: guestEmail,
            phone: guestPhone,
            address: customerInfo.address || 'Việt Nam',
            id_type: 'Other',
            id_number: `CUST-${Date.now()}`,
            nationality: 'Vietnamese',
          },
          { transaction }
        );
      }
      targetCustomerId = cust.id;
    }

    if (!targetCustomerId) {
      throw createError('Vui lòng cung cấp thông tin liên hệ (Họ tên, Email, Số điện thoại)', 400);
    }

    let calculatedTotal = 0;
    const validatedHotelItems = [];
    const validatedTourItems = [];
    const validatedCarItems = [];

    // 2. Validate Hotel Bookings (Strict DB price check & availability)
    for (const hItem of hotelBookings) {
      const roomId = hItem.roomId || hItem.room_id;
      const checkinDate = hItem.checkIn || hItem.checkin_date;
      const checkoutDate = hItem.checkOut || hItem.checkout_date;
      const numGuests = hItem.guests || hItem.num_guests || 1;

      if (!roomId || !checkinDate || !checkoutDate) {
        throw createError('Thông tin đặt phòng khách sạn không đầy đủ', 400);
      }

      const room = await Room.findByPk(roomId, {
        include: [{ model: RoomType, as: 'roomType' }],
        transaction,
      });

      if (!room || room.status === 'Deactivated' || room.status === 'Maintenance') {
        throw createError(`Phòng ${room ? room.room_number : roomId} hiện không khả dụng`, 400);
      }

      // Check conflict
      const conflict = await Booking.findOne({
        where: {
          room_id: roomId,
          status: { [Op.in]: ['Pending', 'Confirmed', 'CheckedIn'] },
          [Op.or]: [
            { checkin_date: { [Op.between]: [checkinDate, checkoutDate] } },
            { checkout_date: { [Op.between]: [checkinDate, checkoutDate] } },
            { checkin_date: { [Op.lte]: checkinDate }, checkout_date: { [Op.gte]: checkoutDate } },
          ],
        },
        transaction,
      });

      if (conflict) {
        throw createError(`Phòng ${room.room_number} đã có người đặt trong thời gian bạn chọn`, 409);
      }

      const cin = new Date(checkinDate);
      const cout = new Date(checkoutDate);
      const nights = Math.max(1, Math.ceil((cout - cin) / (1000 * 60 * 60 * 24)));
      const pricePerNight = parseFloat(room.roomType.base_price);
      const roomTotal = pricePerNight * nights;

      calculatedTotal += roomTotal;
      validatedHotelItems.push({
        room,
        checkinDate,
        checkoutDate,
        numGuests,
        nights,
        pricePerNight,
        roomTotal,
        specialRequests: hItem.specialRequests || '',
      });
    }

    // 3. Validate Tour Bookings
    for (const tItem of tourBookings) {
      const tourId = tItem.tourId || tItem.tour_id;
      const scheduleId = tItem.scheduleId || tItem.schedule_id;
      const people = parseInt(tItem.people || tItem.number_of_people || 1, 10);
      const tourDate = tItem.tourDate || tItem.tour_date || (tItem.date ? tItem.date : new Date().toISOString().slice(0, 10));

      const tour = await Tour.findByPk(tourId, { transaction });
      if (!tour || tour.status !== 'Active') {
        throw createError(`Tour du lịch không tồn tại hoặc đã ngừng hoạt động`, 400);
      }

      let schedule = null;
      if (scheduleId) {
        schedule = await TourSchedule.findByPk(scheduleId, { transaction });
        if (schedule) {
          const remainingSlots = schedule.available_slots - schedule.booked_slots;
          if (remainingSlots < people) {
            throw createError(`Lịch khởi hành tour "${tour.name}" chỉ còn ${remainingSlots} chỗ trống`, 400);
          }
        }
      }

      const unitPrice = parseFloat(tour.price);
      const tourTotal = unitPrice * people;
      calculatedTotal += tourTotal;

      validatedTourItems.push({
        tour,
        schedule,
        tourDate,
        people,
        pickupLocation: tItem.pickupLocation || tItem.pickup_location || 'Đón tại điểm hẹn / khách sạn',
        unitPrice,
        tourTotal,
      });
    }

    // 4. Validate Car Rentals
    for (const cItem of carRentals) {
      const carId = cItem.carId || cItem.car_id;
      const pickupDatetime = cItem.pickup || cItem.pickupDatetime || cItem.pickup_datetime;
      const returnDatetime = cItem.return || cItem.returnDatetime || cItem.return_datetime;
      const driverRequired = Boolean(cItem.driverRequired || cItem.driver_required);

      const car = await Car.findByPk(carId, { transaction });
      if (!car || car.status !== 'Available') {
        throw createError(`Xe "${car ? car.name : carId}" hiện không sẵn sàng cho thuê`, 400);
      }

      const pDate = new Date(pickupDatetime);
      const rDate = new Date(returnDatetime);
      if (rDate <= pDate) {
        throw createError('Thời gian trả xe phải sau thời gian nhận xe', 400);
      }

      // Check overlapping bookings
      const conflictRental = await CarRentalBooking.findOne({
        where: {
          car_id: carId,
          status: { [Op.in]: ['Pending', 'Confirmed', 'Active'] },
          [Op.or]: [
            {
              pickup_datetime: { [Op.lte]: rDate },
              return_datetime: { [Op.gte]: pDate },
            },
          ],
        },
        transaction,
      });

      if (conflictRental) {
        throw createError(`Xe "${car.name}" đã có khách thuê trong khoảng thời gian này`, 409);
      }

      const rentalDays = Math.max(1, Math.ceil((rDate - pDate) / (1000 * 60 * 60 * 24)));
      const pricePerDay = parseFloat(car.price_per_day);
      const driverFee = driverRequired ? 300000 * rentalDays : 0;
      const carTotal = (pricePerDay * rentalDays) + driverFee;
      calculatedTotal += carTotal;

      validatedCarItems.push({
        car,
        pickupLocation: cItem.pickupLocation || cItem.pickup_location || 'Nhận tại sân bay / trung tâm',
        dropoffLocation: cItem.dropoffLocation || cItem.dropoff_location || 'Trả tại sân bay / trung tâm',
        pickupDatetime: pDate,
        returnDatetime: rDate,
        rentalDays,
        driverRequired,
        driverFee,
        pricePerDay,
        carTotal,
      });
    }

    // 5. Create Order
    const orderCode = generateOrderCode();
    const discountAmount = 0;
    const finalAmount = Math.max(0, calculatedTotal - discountAmount);

    const order = await Order.create(
      {
        customer_id: targetCustomerId,
        order_code: orderCode,
        total_amount: calculatedTotal,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        payment_status: 'PENDING',
        order_status: 'CONFIRMED', // Immediately confirmed on checkout in demo/PWA
        contact_name: guestName,
        contact_email: guestEmail,
        contact_phone: guestPhone,
        special_requests: customerInfo.notes || customerInfo.specialRequests || '',
      },
      { transaction }
    );

    // 6. Create Hotel Bookings & OrderItems
    for (const h of validatedHotelItems) {
      await Booking.create(
        {
          order_id: order.id,
          customer_id: targetCustomerId,
          hotel_branch_id: h.room.hotel_branch_id || 1,
          room_id: h.room.id,
          checkin_date: h.checkinDate,
          checkout_date: h.checkoutDate,
          num_guests: h.numGuests,
          special_requests: h.specialRequests,
          status: 'Confirmed',
          room_price_per_night: h.pricePerNight,
          room_price_total: h.roomTotal,
          booking_source: req.user ? 'Web' : 'Walkin',
        },
        { transaction }
      );

      await h.room.update({ status: 'Reserved' }, { transaction });

      await OrderItem.create(
        {
          order_id: order.id,
          service_type: 'HOTEL',
          service_id: h.room.id,
          item_name: `Khách sạn - Phòng ${h.room.room_number} (${h.room.roomType?.name || 'Deluxe'})`,
          quantity: h.nights,
          unit_price: h.pricePerNight,
          total_price: h.roomTotal,
          metadata: {
            checkinDate: h.checkinDate,
            checkoutDate: h.checkoutDate,
            nights: h.nights,
            roomNumber: h.room.room_number,
          },
        },
        { transaction }
      );
    }

    // 7. Create Tour Bookings & OrderItems
    for (const t of validatedTourItems) {
      await TourBooking.create(
        {
          order_id: order.id,
          tour_id: t.tour.id,
          schedule_id: t.schedule ? t.schedule.id : null,
          tour_date: t.tourDate,
          number_of_people: t.people,
          pickup_location: t.pickupLocation,
          unit_price: t.unitPrice,
          total_price: t.tourTotal,
          status: 'Confirmed',
        },
        { transaction }
      );

      if (t.schedule) {
        await t.schedule.increment('booked_slots', { by: t.people, transaction });
      }

      await OrderItem.create(
        {
          order_id: order.id,
          service_type: 'TOUR',
          service_id: t.tour.id,
          item_name: `Tour - ${t.tour.name}`,
          quantity: t.people,
          unit_price: t.unitPrice,
          total_price: t.tourTotal,
          metadata: {
            tourDate: t.tourDate,
            people: t.people,
            pickupLocation: t.pickupLocation,
          },
        },
        { transaction }
      );
    }

    // 8. Create Car Rentals & OrderItems
    for (const c of validatedCarItems) {
      await CarRentalBooking.create(
        {
          order_id: order.id,
          car_id: c.car.id,
          pickup_location: c.pickupLocation,
          dropoff_location: c.dropoffLocation,
          pickup_datetime: c.pickupDatetime,
          return_datetime: c.returnDatetime,
          rental_days: c.rentalDays,
          driver_required: c.driverRequired,
          driver_fee: c.driverFee,
          price_per_day: c.pricePerDay,
          total_price: c.carTotal,
          status: 'Confirmed',
        },
        { transaction }
      );

      await OrderItem.create(
        {
          order_id: order.id,
          service_type: 'CAR_RENTAL',
          service_id: c.car.id,
          item_name: `Thuê xe - ${c.car.name} (${c.rentalDays} ngày)`,
          quantity: c.rentalDays,
          unit_price: c.pricePerDay,
          total_price: c.carTotal,
          metadata: {
            pickupDatetime: c.pickupDatetime,
            returnDatetime: c.returnDatetime,
            driverRequired: c.driverRequired,
            driverFee: c.driverFee,
          },
        },
        { transaction }
      );
    }

    // 9. Create Payment Record
    const paymentMethodMap = {
      BankTransfer: 'BankTransfer',
      QRCode: 'QRCode',
      Momo: 'Momo',
      VNPay: 'VNPay',
      Cash: 'Cash',
    };
    const resolvedMethod = paymentMethodMap[paymentMethod] || 'BankTransfer';

    await Payment.create(
      {
        order_id: order.id,
        invoice_id: null,
        amount: finalAmount,
        payment_method: resolvedMethod,
        transaction_ref: `TXN-${Date.now()}`,
        status: 'Pending',
        notes: `Thanh toán đơn hàng ${orderCode}`,
      },
      { transaction }
    );

    // 10. Create Notification
    await Notification.create(
      {
        user_id: null,
        hotel_branch_id: 1,
        type: 'Booking',
        title: 'Đơn hàng mới hợp nhất',
        message: `Đơn hàng ${orderCode} vừa được tạo với tổng giá trị ${finalAmount.toLocaleString('vi-VN')} đ`,
        related_id: order.id,
        related_type: 'order',
      },
      { transaction }
    );

    await transaction.commit();

    // Fetch full order details to return
    const createdOrder = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items' },
        {
          model: Booking,
          as: 'hotelBookings',
          include: [{ model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] }],
        },
        {
          model: TourBooking,
          as: 'tourBookings',
          include: [{ model: Tour, as: 'tour' }],
        },
        {
          model: CarRentalBooking,
          as: 'carRentals',
          include: [{ model: Car, as: 'car' }],
        },
        { model: Payment, as: 'payments' },
      ],
    });

    req.io?.emit('order:new', { orderCode, totalAmount: finalAmount });

    res.status(201).json({
      success: true,
      message: 'Đặt đơn hàng thành công',
      data: createdOrder,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

// GET /api/orders
const getAllOrders = async (req, res, next) => {
  try {
    const { status, payment_status, email, phone, customer_id, page = 1, limit = 20 } = req.query;
    const where = {};

    if (status) where.order_status = status;
    if (payment_status) where.payment_status = payment_status;

    // Filter by customer if logged in or by query
    let custId = customer_id;
    if (req.user) {
      const cust = await Customer.findOne({ where: { user_id: req.user.id } });
      if (cust) custId = cust.id;
    }

    if (custId) {
      where.customer_id = custId;
    } else if (email || phone) {
      const orConds = [];
      if (email) orConds.push({ contact_email: email });
      if (phone) orConds.push({ contact_phone: phone });
      where[Op.or] = orConds;
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        { model: OrderItem, as: 'items' },
        {
          model: Booking,
          as: 'hotelBookings',
          include: [{ model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] }],
        },
        {
          model: TourBooking,
          as: 'tourBookings',
          include: [{ model: Tour, as: 'tour' }],
        },
        {
          model: CarRentalBooking,
          as: 'carRentals',
          include: [{ model: Car, as: 'car' }],
        },
        { model: Payment, as: 'payments' },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isNumeric = !Number.isNaN(Number(id));
    const where = isNumeric ? { id } : { order_code: id };

    const order = await Order.findOne({
      where,
      include: [
        { model: Customer, as: 'customer' },
        { model: OrderItem, as: 'items' },
        {
          model: Booking,
          as: 'hotelBookings',
          include: [{ model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] }],
        },
        {
          model: TourBooking,
          as: 'tourBookings',
          include: [{ model: Tour, as: 'tour' }, { model: TourSchedule, as: 'schedule' }],
        },
        {
          model: CarRentalBooking,
          as: 'carRentals',
          include: [{ model: Car, as: 'car' }],
        },
        { model: Payment, as: 'payments' },
      ],
    });

    if (!order) {
      throw createError('Không tìm thấy đơn hàng', 404);
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// POST /api/orders/:id/cancel
const cancelOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const isNumeric = !Number.isNaN(Number(id));
    const where = isNumeric ? { id } : { order_code: id };

    const order = await Order.findOne({
      where,
      include: [
        { model: Booking, as: 'hotelBookings' },
        { model: TourBooking, as: 'tourBookings' },
        { model: CarRentalBooking, as: 'carRentals' },
        { model: Payment, as: 'payments' },
      ],
      transaction,
    });

    if (!order) {
      throw createError('Không tìm thấy đơn hàng', 404);
    }

    if (order.order_status === 'CANCELLED') {
      throw createError('Đơn hàng này đã bị hủy trước đó', 400);
    }

    // Cancel Hotel Bookings & free rooms
    for (const bk of order.hotelBookings) {
      await bk.update({ status: 'Cancelled' }, { transaction });
      const room = await Room.findByPk(bk.room_id, { transaction });
      if (room && room.status === 'Reserved') {
        await room.update({ status: 'Available' }, { transaction });
      }
    }

    // Cancel Tour Bookings & restore slots
    for (const tb of order.tourBookings) {
      await tb.update({ status: 'Cancelled' }, { transaction });
      if (tb.schedule_id) {
        const schedule = await TourSchedule.findByPk(tb.schedule_id, { transaction });
        if (schedule) {
          await schedule.decrement('booked_slots', { by: tb.number_of_people, transaction });
        }
      }
    }

    // Cancel Car Rentals
    for (const cr of order.carRentals) {
      await cr.update({ status: 'Cancelled' }, { transaction });
    }

    // Update payments
    for (const p of order.payments) {
      await p.update({ status: 'Refunded' }, { transaction });
    }

    await order.update(
      {
        order_status: 'CANCELLED',
        payment_status: order.payment_status === 'PAID' ? 'REFUNDED' : 'UNPAID',
      },
      { transaction }
    );

    await transaction.commit();

    res.json({
      success: true,
      message: 'Hủy đơn hàng thành công',
      data: order,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

// POST /api/orders/:id/pay
const payOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { paymentMethod = 'BankTransfer', transactionRef } = req.body;
    const isNumeric = !Number.isNaN(Number(id));
    const where = isNumeric ? { id } : { order_code: id };

    const order = await Order.findOne({
      where,
      include: [{ model: Payment, as: 'payments' }],
      transaction,
    });

    if (!order) {
      throw createError('Không tìm thấy đơn hàng', 404);
    }

    await order.update(
      {
        payment_status: 'PAID',
        order_status: 'CONFIRMED',
      },
      { transaction }
    );

    // Update existing payment or create success payment
    if (order.payments && order.payments.length > 0) {
      await order.payments[0].update(
        {
          status: 'Success',
          payment_method: paymentMethod,
          transaction_ref: transactionRef || `TXN-PAID-${Date.now()}`,
          paid_at: new Date(),
        },
        { transaction }
      );
    } else {
      await Payment.create(
        {
          order_id: order.id,
          amount: order.final_amount,
          payment_method: paymentMethod,
          transaction_ref: transactionRef || `TXN-PAID-${Date.now()}`,
          status: 'Success',
          paid_at: new Date(),
        },
        { transaction }
      );
    }

    await transaction.commit();

    res.json({
      success: true,
      message: 'Thanh toán đơn hàng thành công',
      data: order,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

module.exports = {
  checkout,
  getAllOrders,
  getOrderById,
  cancelOrder,
  payOrder,
};
