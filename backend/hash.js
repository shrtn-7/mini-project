const bcrypt = require("bcryptjs");

const hashPassword = async () => {
    const hashed = await bcrypt.hash("mypassword", 10);
    console.log("Hashed Password:", hashed);
};

hashPassword();
