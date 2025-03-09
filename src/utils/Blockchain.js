import Web3 from "web3";
import TicketNFTABI from "../../artifacts/contracts/TicketNFT.sol/TicketNFT.json";
import config from "../config.js";

let web3;
let ticketContract;

// Initialize blockchain connection
const initBlockchain = () => {
    web3 = new Web3(new Web3.providers.HttpProvider(config.blockchainUrl));
    ticketContract = new web3.eth.Contract(TicketNFTABI.abi, config.ticketContractAddress);
    console.log('Blockchain connection initialized');
    return { web3, ticketContract };
};

module.exports = {
    initBlockchain,
    getWeb3: () => web3,
    getTicketContract: () => ticketContract
};
