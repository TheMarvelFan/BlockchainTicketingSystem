import dotenv from "dotenv";

dotenv.config();

module.exports = {
    // MongoDB connection string
    mongoURI: process.env.MONGO_URI || "mongodb://localhost:27017/ticket-blockchain-app",

    // Blockchain configuration
    blockchainUrl: process.env.BLOCKCHAIN_URL || "http://localhost:8545",
    ticketContractAddress: process.env.CONTRACT_ADDRESS,

    // JWT for authentication
    jwtSecret: process.env.JWT_SECRET || "OIU4nfu8n23fdNJUFD_A_IR8374nfo8ywsn9f2k34c2-KMCkljfasdufIKPE98okEkfkdas",
    jwtExpire: process.env.JWT_EXPIRE || "1d",

    // Application settings
    port: process.env.PORT || 5000,
    environment: process.env.NODE_ENV || "development",

    // OTP settings
    otpExpireTime: 5 * 60 * 1000, // 5 minutes in milliseconds

    // Gas limit settings for blockchain transactions
    defaultGasLimit: 500000,

    // CORS settings
    corsOrigin: process.env.CORS_ORIGIN || "*"
};
