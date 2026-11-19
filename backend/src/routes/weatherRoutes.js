import { Router } from 'express';
import { getWeatherDistricts, getWeatherForecast } from '../controllers/weatherController.js';

const router = Router();
router.get('/', getWeatherForecast);
router.get('/districts', getWeatherDistricts);

export default router;
