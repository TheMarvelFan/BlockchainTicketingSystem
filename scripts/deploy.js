import hre from "hardhat";

async function main() {
    const TicketNFT = await hre.ethers.getContractFactory("TicketNFT");
    console.log("Deploying TicketNFT...");
    const ticketNFT = await TicketNFT.deploy();
    await ticketNFT.waitForDeployment();
    const address = await ticketNFT.getAddress();
    console.log("TicketNFT deployed to:", address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
