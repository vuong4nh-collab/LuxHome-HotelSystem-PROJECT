const { Op } = require('sequelize');
const { Tour, TourSchedule, TourItinerary, City, Location } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');

// GET /api/tours
const getAllTours = async (req, res, next) => {
  try {
    const {
      city_id,
      city,
      location_id,
      search,
      minPrice,
      maxPrice,
      status = 'Active',
      page = 1,
      limit = 30,
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (location_id) where.location_id = location_id;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    const cityInclude = { model: City, as: 'city', attributes: ['id', 'name', 'slug'] };
    if (city_id) {
      where.city_id = city_id;
    } else if (city) {
      cityInclude.where = {
        [Op.or]: [
          { name: { [Op.like]: `%${city}%` } },
          { slug: { [Op.like]: `%${city}%` } },
        ],
      };
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await Tour.findAndCountAll({
      where,
      include: [
        cityInclude,
        { model: Location, as: 'location', attributes: ['id', 'name', 'slug'] },
        {
          model: TourSchedule,
          as: 'schedules',
          where: {
            start_datetime: { [Op.gte]: new Date() },
            status: 'Open',
          },
          required: false,
        },
      ],
      order: [['price', 'ASC']],
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

// GET /api/tours/:id
const getTourById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isNumeric = !Number.isNaN(Number(id));
    const where = isNumeric ? { id } : { slug: id };

    const tour = await Tour.findOne({
      where,
      include: [
        { model: City, as: 'city' },
        { model: Location, as: 'location' },
        {
          model: TourSchedule,
          as: 'schedules',
          where: {
            start_datetime: { [Op.gte]: new Date() },
          },
          required: false,
          order: [['start_datetime', 'ASC']],
        },
        {
          model: TourItinerary,
          as: 'itineraries',
          order: [['sequence', 'ASC']],
        },
      ],
    });

    if (!tour) {
      throw createError('Không tìm thấy thông tin tour du lịch', 404);
    }

    res.json({ success: true, data: tour });
  } catch (err) {
    next(err);
  }
};

// GET /api/tours/:id/schedules
const getTourSchedules = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedules = await TourSchedule.findAll({
      where: {
        tour_id: id,
        start_datetime: { [Op.gte]: new Date() },
        status: { [Op.in]: ['Open', 'Full'] },
      },
      order: [['start_datetime', 'ASC']],
    });
    res.json({ success: true, data: schedules });
  } catch (err) {
    next(err);
  }
};

// GET /api/cities/:cityId/tours
const getToursByCity = async (req, res, next) => {
  try {
    const { cityId } = req.params;
    const tours = await Tour.findAll({
      where: { city_id: cityId, status: 'Active' },
      include: [
        { model: City, as: 'city' },
        { model: Location, as: 'location' },
      ],
      order: [['price', 'ASC']],
    });
    res.json({ success: true, data: tours });
  } catch (err) {
    next(err);
  }
};

// GET /api/locations/:locationId/tours
const getToursByLocation = async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const tours = await Tour.findAll({
      where: { location_id: locationId, status: 'Active' },
      include: [
        { model: City, as: 'city' },
        { model: Location, as: 'location' },
      ],
      order: [['price', 'ASC']],
    });
    res.json({ success: true, data: tours });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllTours,
  getTourById,
  getTourSchedules,
  getToursByCity,
  getToursByLocation,
};
