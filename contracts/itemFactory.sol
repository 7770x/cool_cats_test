// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./common/ERC1155SupplyCC.sol";
//added missing import of Milk:
import "./Milk.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ItemFactory is ERC1155SupplyCC, AccessControl {
    /// @dev Track last time a claim was made for a specific pet
    //Change that to track claims made by an address
    mapping(address => uint256) public _lastUpdate;

    //added missing ADMIN_ROLE declaration:
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    address public _milkContractAddress;

    /// @dev Rarity rolls
    uint16 public _commonRoll = 60;
    uint16 public _uncommonRoll = 80;
    uint16 public _rareRoll = 90;
    uint16 public _epicRoll = 98;
    uint16 public _legendaryRoll = 100;
    //added missing _maxRarityRoll declaration:
    uint16 public _maxRarityRoll = 110;

    enum ERarity {
        COMMON,
        UNCOMMON,
        RARE,
        EPIC,
        LEGENDARY
    }
    //added missing EType enums:
    enum EType {
        MILK,
        ITEMS,
        BOX
    }
    /// @dev rewardType => (rewardRarity => data)
    mapping(uint256 => mapping(uint256 => bytes)) _rewardMapping;

    //added undeclared event LogDailyClaim
    event LogDailyClaim(
        address indexed claimer,
        uint256 rewardType,
        uint256 rewardRarity,
        bytes rewardData
    );

    //add ERC1155(uri) to define it as otherwise it'd be abstract
    constructor(string memory uri, address milkContractAddress) ERC1155(uri) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _milkContractAddress = milkContractAddress;
    }

    function claim(address claimer, uint256 entropy) external {
        // generate a single random number and bit shift as needed
        //renamed randomNum as _randomNum to avoid duplicate declaration:
        uint256 _randomNum = randomNum(entropy);

        // roll and pick the rarity level of the reward
        uint256 randRarity = _randomNum % _maxRarityRoll;
        uint256 rewardRarity;
        bytes memory rewardData;
        uint256 rewardType = uint256(EType.BOX);

        // pick rarity based on rarity chances
        if (randRarity < _commonRoll) {
            rewardRarity = uint256(ERarity.COMMON);
        } else if (randRarity < _uncommonRoll) {
            rewardRarity = uint256(ERarity.UNCOMMON);
        } else if (randRarity < _rareRoll) {
            rewardRarity = uint256(ERarity.RARE);
        } else if (randRarity < _epicRoll) {
            rewardRarity = uint256(ERarity.EPIC);
        } else {
            rewardRarity = uint256(ERarity.LEGENDARY);
        }

        // handle Legendary on its own
        // always a box
        if (rewardRarity == uint256(ERarity.LEGENDARY)) {
            // give the user a box
            _mint(claimer, uint256(EType.BOX), 1, "");
        }
        // handle MILK or ITEMS
        else {
            // This will pick a random number between 0 and 1 inc.
            // MILK or ITEMS.
            //If EType.BOX is set as 2, the modulo formula below will return either 0 or 1, i.e. MILK or ITEMS:
            rewardType = randomNum(entropy) % uint256(EType.BOX);
            // convert the reward mapping data to min and max
            (uint256 min, uint256 max, uint256[] memory ids) = abi.decode(
                _rewardMapping[rewardType][rewardRarity],
                (uint256, uint256, uint256[])
            );

            // do some bit shifting magic to create random min max
            //removed lootData as undeclared and unnecessary as max and min are being passed as params
            uint256 rewardAmount = min +
                ((randomNum(entropy)) % (max - min + 1));

            // Give a MILK reward
            if (rewardType == uint256(EType.MILK)) {
                Milk milk = Milk(_milkContractAddress);
                milk.gameMint(claimer, rewardAmount);
                rewardData = abi.encode(rewardAmount);
            }
            // Give an item reward
            else {
                //removed lootData as undeclared and unnecessary as ids are being passed as a param
                uint256 index = (randomNum(entropy)) % ids.length;
                _mint(claimer, ids[index], rewardAmount, "");
                rewardData = abi.encode(ids[index], rewardAmount);
            }
        }

        emit LogDailyClaim(claimer, rewardType, rewardRarity, rewardData);

        //require that the claimer claimed not less than 24 hours ago from the current block timestamp:
        require(
            _lastUpdate[claimer] + 60 * 60 * 24 < block.timestamp,
            "Claimed in the last 24 hours"
        );
        //Make claims specific to claimer, not pet:
        _lastUpdate[claimer] = block.timestamp;
    }

    //add view as Function state mutability can be restricted to view
    function randomNum(uint256 entropy) internal view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encode(block.timestamp, block.difficulty, entropy)
                )
            );
    }

    /** SETTERS */

    /// @notice returns the rarity level set for each rarity, and the maximum roll
    /// @param common - rarity level of common quests
    /// @param uncommon - rarity level of uncommon quests
    /// @param rare - rarity level of rare quests
    /// @param epic - rarity level of epic quests
    /// @param legendary - rarity level of legendary quests
    /// @param maxRoll - max rarity level
    function setRarityRolls(
        uint16 common,
        uint16 uncommon,
        uint16 rare,
        uint16 epic,
        uint16 legendary,
        uint16 maxRoll
    ) external onlyRole(ADMIN_ROLE) {
        require(common < uncommon, "Common must be less rare than uncommon");
        require(uncommon < rare, "Uncommon must be less rare than rare");
        require(rare < epic, "Rare must be less rare than epic");
        require(epic < legendary, "Epic must be less rare than legendary");
        require(
            legendary <= maxRoll,
            "Legendary rarity level must be less than or equal to the max rarity roll"
        );

        _commonRoll = common;
        _uncommonRoll = uncommon;
        _rareRoll = rare;
        _epicRoll = epic;
        _legendaryRoll = legendary;
        _maxRarityRoll = maxRoll;
    }

    function setReward(
        uint256 rewardType,
        uint256 rewardRarity,
        bytes calldata rewardData
    ) external onlyRole(ADMIN_ROLE) {
        //unused:
        // (uint256 min, uint256 max, uint256[] memory ids) = abi.decode(
        //     rewardData, (uint256, uint256, uint256[])
        // );

        _rewardMapping[rewardType][rewardRarity] = rewardData;
    }

    //added supportsInterface as required for derived contracts
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
