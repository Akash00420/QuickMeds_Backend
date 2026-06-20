const express = require("express");
const router = express.Router();

const loginController = require("../../controllers/loginController/loginController");

router.post("/create-login", loginController.createLogin);

module.exports = router;
