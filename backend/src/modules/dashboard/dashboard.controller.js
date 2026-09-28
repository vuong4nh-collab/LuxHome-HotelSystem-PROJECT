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

// GET /api/dashboard/stats
const getStats = async (req, res, next) => {
  try {
    // Return stats matching the CoreUI specification
    res.json({
      success: true,
      data: {
        users: {
          value: '26K',
          change: '-12.4%',
          isPositive: false,
          series: [65, 59, 84, 84, 51, 55, 40],
        },
        income: {
          value: '$6.200',
          change: '+40.9%',
          isPositive: true,
          series: [1, 18, 9, 17, 34, 22, 11],
        },
        conversion: {
          value: '2.49%',
          change: '+84.7%',
          isPositive: true,
          series: [78, 81, 80, 45, 34, 12, 40],
        },
        sessions: {
          value: '44K',
          change: '-23.6%',
          isPositive: false,
          series: [78, 81, 80, 45, 34, 12, 40, 85, 65, 23, 12, 98, 34, 84, 67, 82],
        },
      },
    });
  } catch (err) { next(err); }
};

// GET /api/dashboard/traffic?range=day|month|year
const getTraffic = async (req, res, next) => {
  try {
    const { range = 'month' } = req.query;

    let labels = [];
    let visits = [];
    let newUsers = [];
    let periodText = 'January - July 2021';

    if (range === 'day') {
      labels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      visits = [53, 95, 140, 110, 165, 190, 175];
      newUsers = [40, 70, 95, 80, 125, 140, 130];
      periodText = 'Current Week (Monday - Sunday)';
    } else if (range === 'year') {
      labels = ['2018', '2019', '2020', '2021', '2022', '2023', '2024'];
      visits = [120, 145, 110, 160, 185, 195, 210];
      newUsers = [85, 105, 80, 115, 130, 145, 155];
      periodText = '2018 - 2024 Annual Trends';
    } else {
      // Month
      labels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];
      visits = [65, 140, 115, 160, 145, 175, 165];
      newUsers = [50, 95, 80, 110, 90, 120, 115];
      periodText = 'January - July 2021';
    }

    res.json({
      success: true,
      data: {
        range,
        periodText,
        labels,
        visits,
        newUsers,
        threshold: 65,
        summary: {
          visits: { label: 'Visits', value: '29.703 Users', percentage: 40, color: 'success' },
          unique: { label: 'Unique', value: '24.093 Users', percentage: 20, color: 'info' },
          pageviews: { label: 'Pageviews', value: '78.706 Views', percentage: 60, color: 'warning' },
          newUsers: { label: 'New Users', value: '22.123 Users', percentage: 80, color: 'danger' },
          bounceRate: { label: 'Bounce Rate', value: '40.15%', percentage: 40.15, color: 'primary' },
        },
      },
    });
  } catch (err) { next(err); }
};

// GET /api/dashboard/social
const getSocial = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        facebook: { friends: '89k', feeds: '459' },
        twitter: { followers: '973k', tweets: '1.792' },
        linkedin: { contacts: '500+', feeds: '1.292' },
      },
    });
  } catch (err) { next(err); }
};

module.exports = {
  getSummary,
  getRevenue,
  getOccupancy,
  getRoomStats,
  getStats,
  getTraffic,
  getSocial,
};

