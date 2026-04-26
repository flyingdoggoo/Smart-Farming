import { Router } from 'express';
import * as legacyController from '../controllers/legacy.controller';

const router = Router();

router.get('/update.php', legacyController.updatePhpCompat);
router.get('/getLedStatus.php', legacyController.getLedStatusPhpCompat);
router.get('/getmode.php', legacyController.getModePhpCompat);
router.get('/getTimeOnOff.php', legacyController.getTimeOnOffPhpCompat);
router.get('/getSensorData.php', legacyController.getSensorDataPhpCompat);
router.get('/get_readings_ajax.php', legacyController.getReadingsAjaxPhpCompat);
router.get('/getThreshhold.php', legacyController.getThresholdPhpCompat);
router.get('/checkSensor.php', legacyController.checkSensorPhpCompat);

export default router;
