const { Op } = require('sequelize');
const { Car, CarRentalBooking, City, Location } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');

// GET /api/cars
const getAllCars = async (req, res, next) => {
  try {
    const {
      city_id,
      city,
      location_id,
      carType,
      type,
      seats,
      brand,
      minPrice,
      maxPrice,
      pickupDate,
      returnDate,
      status = 'Available',
      page = 1,
      limit = 30,
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (location_id) where.location_id = location_id;
    if (carType || type) where.type = carType || type;
    if (seats) where.seats = { [Op.gte]: parseInt(seats, 10) };
    if (brand) where.brand = brand;

    if (minPrice || maxPrice) {
      where.price_per_day = {};
      if (minPrice) where.price_per_day[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price_per_day[Op.lte] = parseFloat(maxPrice);
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

    // Availability filter if pickupDate & returnDate are specified
    if (pickupDate && returnDate) {
      const pDate = new Date(pickupDate);
      const rDate = new Date(returnDate);

      // Find all car_ids that have overlapping active/confirmed bookings
      const bookedCars = await CarRentalBooking.findAll({
        attributes: ['car_id'],
        where: {
          status: { [Op.in]: ['Pending', 'Confirmed', 'Active'] },
          [Op.or]: [
            {
              pickup_datetime: { [Op.lte]: rDate },
              return_datetime: { [Op.gte]: pDate },
            },
          ],
        },
      });

      const bookedCarIds = bookedCars.map(b => b.car_id);
      if (bookedCarIds.length > 0) {
        where.id = { [Op.notIn]: bookedCarIds };
      }
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await Car.findAndCountAll({
      where,
      include: [
        cityInclude,
        { model: Location, as: 'location', attributes: ['id', 'name', 'slug'] },
      ],
      order: [['price_per_day', 'ASC']],
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

// GET /api/cars/:id
const getCarById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const car = await Car.findByPk(id, {
      include: [
        { model: City, as: 'city' },
        { model: Location, as: 'location' },
      ],
    });

    if (!car) {
      throw createError('Không tìm thấy thông tin xe', 404);
    }

    res.json({ success: true, data: car });
  } catch (err) {
    next(err);
  }
};

// GET /api/cities/:cityId/cars
const getCarsByCity = async (req, res, next) => {
  try {
    const { cityId } = req.params;
    const cars = await Car.findAll({
      where: { city_id: cityId, status: 'Available' },
      include: [
        { model: City, as: 'city' },
        { model: Location, as: 'location' },
      ],
      order: [['price_per_day', 'ASC']],
    });
    res.json({ success: true, data: cars });
  } catch (err) {
    next(err);
  }
};

// GET /api/locations/:locationId/cars
const getCarsByLocation = async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const cars = await Car.findAll({
      where: { location_id: locationId, status: 'Available' },
      include: [
        { model: City, as: 'city' },
        { model: Location, as: 'location' },
      ],
      order: [['price_per_day', 'ASC']],
    });
    res.json({ success: true, data: cars });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllCars,
  getCarById,
  getCarsByCity,
  getCarsByLocation,
};
