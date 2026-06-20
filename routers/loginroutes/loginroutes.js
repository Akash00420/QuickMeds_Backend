const express = require("express");
const router = express.Router();

const loginController = require("../../controllers/logincontroller/logincontroller");

router.post("/create-login", loginController.createLogin);

module.exports = router;
