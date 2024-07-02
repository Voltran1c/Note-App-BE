const jwt = require("jsonwebtoken"); // Authenticate token user
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"]; // เข้าถึง header ของ req obj
  const token = authHeader && authHeader.split(" ")[1]; // ดู header แล้วไปเอา token ออกมา โดยการ split
  console.log(`access token ${token}`); // show token
  if (!token) return res.sendStatus(401); // when dont't have
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    // jwt ใช้ ACCESS_TOKEN ในการ verify
    if (err) return res.sendStatus(403);
    console.log(user);
    req.user = user; // ถ้าใช่ user เข้าไปขอ req ได้
    next(); // ส่งข้อมูลให้ Middleware ถัดไป เนื่องจากเป็น Auth
  });
}

// export the auth to be used in route definitious
module.exports = {
  authenticateToken,
};
