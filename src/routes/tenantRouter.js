const router = require('express').Router()
const { createTenant, getTenantsByOwner, updateTenant, getTenantById, deleteTenant } = require('../controllers/tenantController')
const protectedToken = require('../middlewares/verifyAccessTokenMiddleware')

router.post('/tenants/add-tenant', protectedToken, createTenant )
router.get('/tenants', protectedToken, getTenantsByOwner)
router.patch('/tenant/:id', protectedToken, updateTenant)
router.get('/tenant/:id', protectedToken, getTenantById)
router.delete('/tenant/:id', protectedToken, deleteTenant)

module.exports = router