// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    struct Ticket {
        uint256 tokenId;
        address seller;
        address owner;
        uint256 price;
        uint256 eventId;
        uint256 venueId;
        bool sold;
        bool used;
        bool locked;
    }

    mapping(uint256 => Ticket) public tickets;
    mapping(address => bool) public verifiers;
    mapping(uint256 => string) private otpHashes;

    event TicketMinted(uint256 tokenId, address seller, uint256 price, uint256 eventId, uint256 venueId);
    event TicketPurchased(uint256 tokenId, address buyer, uint256 price);
    event TicketBurned(uint256 tokenId, address owner);
    event VerifierAdded(address verifier);
    event VerifierRemoved(address verifier);

    constructor() ERC721("Event Ticket", "TCKT") Ownable(msg.sender) {}

    modifier onlyVerifier() {
        require(verifiers[msg.sender], "Not an authorized verifier");
        _;
    }

    function addVerifier(address verifier) external onlyOwner {
        verifiers[verifier] = true;
        emit VerifierAdded(verifier);
    }

    function removeVerifier(address verifier) external onlyOwner {
        verifiers[verifier] = false;
        emit VerifierRemoved(verifier);
    }

    function mintTicket(string memory tokenURI, uint256 price, uint256 eventId, uint256 venueId)
    external
    returns (uint256)
    {
        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        tickets[newTokenId] = Ticket({
            tokenId: newTokenId,
            seller: msg.sender,
            owner: msg.sender,
            price: price,
            eventId: eventId,
            venueId: venueId,
            sold: false,
            used: false,
            locked: false
        });

        emit TicketMinted(newTokenId, msg.sender, price, eventId, venueId);
        return newTokenId;
    }

    function buyTicket(uint256 tokenId) external payable {
        Ticket storage ticket = tickets[tokenId];
        require(ticket.tokenId == tokenId, "Ticket does not exist");
        require(!ticket.sold, "Ticket already sold");
        require(msg.value >= ticket.price, "Insufficient payment");
        require(ticket.seller != msg.sender, "Seller cannot buy own ticket");

        // Transfer ownership
        _transfer(ticket.seller, msg.sender, tokenId);

        // Pay the seller
        payable(ticket.seller).transfer(msg.value);

        // Update ticket details
        ticket.owner = msg.sender;
        ticket.sold = true;
        ticket.locked = true; // Lock the ticket after purchase

        emit TicketPurchased(tokenId, msg.sender, ticket.price);
    }

    function setOTPHash(uint256 tokenId, string memory otpHash) external onlyVerifier {
        require(_exists(tokenId), "Ticket does not exist");
        Ticket storage ticket = tickets[tokenId];
        require(ticket.sold, "Ticket not sold yet");
        require(!ticket.used, "Ticket already used");

        otpHashes[tokenId] = otpHash;
    }

    function burnTicket(uint256 tokenId, string memory otp) external {
        require(_exists(tokenId), "Ticket does not exist");
        Ticket storage ticket = tickets[tokenId];
        require(ticket.owner == msg.sender, "Not ticket owner");
        require(ticket.sold, "Ticket not sold yet");
        require(!ticket.used, "Ticket already used");

        // Verify OTP (in a real implementation, you'd use keccak256 to hash and compare)
        bytes32 providedHash = keccak256(abi.encodePacked(otp));
        bytes32 storedHash = keccak256(abi.encodePacked(otpHashes[tokenId]));
        require(providedHash == storedHash, "Invalid OTP");

        // Mark as used
        ticket.used = true;

        // Burn the token
        _burn(tokenId);

        emit TicketBurned(tokenId, msg.sender);
    }

    // Override transferFrom to implement non-transferability after purchase
    function transferFrom(address from, address to, uint256 tokenId) public virtual override(ERC721, IERC721) {
        // Allow initial minting and purchase, but prevent subsequent transfers
        if (from != address(0) && to != address(0)) {
            Ticket storage ticket = tickets[tokenId];
            require(!ticket.locked || from == ticket.seller, "Ticket is locked and non-transferable");
        }
        super.transferFrom(from, to, tokenId);
    }

    // Override safeTransferFrom to implement non-transferability after purchase
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data)
    public
    virtual
    override(ERC721, IERC721)
    {
        // Allow initial minting and purchase, but prevent subsequent transfers
        if (from != address(0) && to != address(0)) {
            Ticket storage ticket = tickets[tokenId];
            require(!ticket.locked || from == ticket.seller, "Ticket is locked and non-transferable");
        }
        super.safeTransferFrom(from, to, tokenId, data);
    }

    // Return ticket information
    function getTicket(uint256 tokenId) external view returns (Ticket memory) {
        require(_exists(tokenId) || tickets[tokenId].used, "Ticket does not exist");
        return tickets[tokenId];
    }

    // Get all tickets created by a seller
    function getTicketsBySeller(address seller) external view returns (uint256[] memory) {
        uint256 totalTickets = _tokenIds;
        uint256[] memory result = new uint256[](totalTickets);
        uint256 counter = 0;

        for (uint256 i = 1; i <= totalTickets; i++) {
            if (tickets[i].seller == seller) {
                result[counter] = i;
                counter++;
            }
        }

        // Resize array to actual count
        uint256[] memory resized = new uint256[](counter);
        for (uint256 i = 0; i < counter; i++) {
            resized[i] = result[i];
        }

        return resized;
    }

    // Get all tickets owned by a buyer
    function getTicketsByOwner(address owner) external view returns (uint256[] memory) {
        uint256 totalTickets = _tokenIds;
        uint256[] memory result = new uint256[](totalTickets);
        uint256 counter = 0;

        for (uint256 i = 1; i <= totalTickets; i++) {
            if (tickets[i].owner == owner) {
                result[counter] = i;
                counter++;
            }
        }

        // Resize array to actual count
        uint256[] memory resized = new uint256[](counter);
        for (uint256 i = 0; i < counter; i++) {
            resized[i] = result[i];
        }

        return resized;
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
