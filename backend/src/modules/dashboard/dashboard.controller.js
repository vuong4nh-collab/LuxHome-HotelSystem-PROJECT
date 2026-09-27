const { sequelize, Booking, Room, Invoice, Payment, Customer, HousekeepingTask } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');

// GET /api/dashboard/summary
const getSummary = async (req, res, next) => {
  try {
    const { hotel_branch_id } = req.query;
    const today = new Date();
    const startOfDay = new Date(today.setHours(0,0,0,0));
    const endOfDay = new Date(today.setHours(23,59,59,999));

    const roomWhere = { is_active: true };
    const bookingWhere = { checkin_date: { [Op.between]: [startOfDay, endOfDay] }, status: { [Op.in]: ['Confirmed','Pending'] } };
    const taskWhere = { status: { [Op.in]: ['Pending','InProgress'] } };
    const paymentWhere = { paid_at: { [Op.between]: [startOfDay, endOfDay] }, status: 'Success' };

    if (hotel_branch_id) {
      roomWhere.hotel_branch_id = parseInt(hotel_branch_id);
      bookingWhere.hotel_branch_id = parseInt(hotel_branch_id);
      taskWhere.hotel_branch_id = parseInt(hotel_branch_id);
      paymentWhere.hotel_branch_id = parseInt(hotel_branch_id);
    }

    const [
      totalRooms, availableRooms, occupiedRooms, cleaningRooms,
      todayCheckins, todayCheckouts, pendingTasks, todayRevenue, totalCustomers
    ] = await Promise.all([
      Room.count({ where: roomWhere }),
      Room.count({ where: { ...roomWhere, status: 'Available' } }),
      Room.count({ where: { ...roomWhere, status: 'Occupied' } }),
      Room.count({ where: { ...roomWhere, status: 'Cleaning' } }),
      Booking.count({ where: bookingWhere }),
      Booking.count({ where: { ...bookingWhere, checkout_date: { [Op.between]: [startOfDay, endOfDay] }, status: 'CheckedIn' } }),
      HousekeepingTask.count({ where: taskWhere }),
      Payment.sum('amount', { where: paymentWhere }),
      Customer.count({ where: { is_active: true } }),
    ]);

    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        rooms: { total: totalRooms, available: availableRooms, occupied: occupiedRooms, cleaning: cleaningRooms },
        today: { checkins: todayCheckins, checkouts: todayCheckouts, revenue: todayRevenue || 0 },
        housekeeping: { pendingTasks },
        customers: { total: totalCustomers },
        occupancyRate: parseFloat(occupancyRate),
      },
    });
  } catch (err) { next(err); }
};

// GET /api/dashboard/revenue?from=&to=
const getRevenue = async (req, res, next) => {
  try {
    const { from, to, group = 'day' } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
    const toDate = to ? new Date(to) : new Date();

    let dateFormat = '%Y-%m-%d';
    if (group === 'month') dateFormat = '%Y-%m';
    if (group === 'year') dateFormat = '%Y';

    const revenue = await Payment.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('paid_at'), dateFormat), 'period'],
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: {
        paid_at: { [Op.between]: [fromDate, toDate] },
        status: 'Success',
      },
      group: [fn('DATE_FORMAT', col('paid_at'), dateFormat)],
      order: [[fn('DATE_FORMAT', col('paid_at'), dateFormat), 'ASC']],
      raw: true,
    });

    res.json({ success: true, data: revenue });
  } catch (err) { next(err); }
};

// GET /api/dashboard/occupancy
const getOccupancy = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
    const toDate = to ? new Date(to) : new Date();

    const bookings = await Booking.findAll({
      attributes: [
        [fn('DATE', col('checkin_date')), 'date'],
        [fn('COUNT', col('id')), 'bookings'],
      ],
      where: {
        checkin_date: { [Op.between]: [fromDate, toDate] },
        status: { [Op.in]: ['CheckedIn','CheckedOut','Confirmed'] },
      },
      group: [fn('DATE', col('checkin_date'))],
      order: [[fn('DATE', col('checkin_date')), 'ASC']],
      raw: true,
    });

    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
};

// GET /api/dashboard/room-stats
const getRoomStats = async (req, res, next) => {
  try {
    const roomStats = await Room.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      where: { is_active: true },
      group: ['status'],
      raw: true,
    });
    res.json({ success: true, data: roomStats });
  } catch (err) { next(err); }
};

module.exports = { getSummary, getRevenue, getOccupancy, getRoomStats };
