import { ApiError } from "./ApiError.js";
import Web3 from "web3";

const createWalletAddress = async () => {
    let walletAddress = null;
    let privateKey = null;
    // Create wallet for buyer or seller
    try {
        // Initialize web3
        const web3 = new Web3();

        // Create account
        const account = web3.eth.accounts.create();

        // Get address and private key
        walletAddress = account.address;
        privateKey = account.privateKey;

        // For security in a production environment, you should encrypt the private key
        // before storing it, or use a proper key management system
        const encryptedPrivateKey = crypto
            .createHash("sha256")
            .update(privateKey + process.env.PRIVATE_KEY_SECRET)
            .digest("hex");

        return [ walletAddress, encryptedPrivateKey ];
    } catch (error) {
        console.error("Error creating wallet:", error);
        throw new ApiError(500, "Error creating blockchain wallet");
    }
}

export { createWalletAddress };
