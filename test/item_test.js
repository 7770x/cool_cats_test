const { expect } = require("chai");
const keccak256 = require("keccak256");

describe("ItemFactory Contract Test", async function () {
  let milk, itemFactory;

  beforeEach(async function () {
    [deployer, admin, depositor, master, game, user] = await ethers.getSigners();

    const Milk = await ethers.getContractFactory("Milk");
    milk = await Milk.deploy("MilkReward", "MLK");
    await milk.deployed();

    const ItemFactory = await ethers.getContractFactory("ItemFactory");
    itemFactory = await ItemFactory.deploy("oursite/{id}.json", milk.address);
  });

  it("Only deployer should have DEFAULT_ADMIN_ROLE", async function () {
    const role = await itemFactory.DEFAULT_ADMIN_ROLE();
    let hasRole = await itemFactory.hasRole(role, deployer.address);
    expect(hasRole).to.be.eq(true);
    hasRole = await itemFactory.hasRole(role, user.address);
    expect(hasRole).to.be.eq(false);
  });

  it("Only ADMIN_ROLE can set rarity rolls", async function () {
    const adminRole = await itemFactory.ADMIN_ROLE();
    const _commonRoll = 50;
    const _uncommonRoll = 70;
    const _rareRoll = 80;
    const _epicRoll = 90;
    const _legendaryRoll = 100;
    const _maxRarityRoll = 150;

    await expect(
      itemFactory.connect(admin).setRarityRolls(_commonRoll, _uncommonRoll, _rareRoll, _epicRoll, _legendaryRoll, _maxRarityRoll)
    ).to.be.revertedWith(`AccessControl: account ${admin.address.toLowerCase()} is missing role ${adminRole}`);
    console.log(`ADMIN_ROLE=0x${keccak256("ADMIN_ROLE").toString("hex")}`);
    console.log(`AccessControl: account ${admin.address.toLowerCase()} is missing role ${adminRole}`);
    await itemFactory.grantRole(adminRole, admin.address);

    await itemFactory.connect(admin).setRarityRolls(_commonRoll, _uncommonRoll, _rareRoll, _epicRoll, _legendaryRoll, _maxRarityRoll);

    expect(await itemFactory._commonRoll()).to.be.eq(_commonRoll);
    expect(await itemFactory._uncommonRoll()).to.be.eq(_uncommonRoll);
    expect(await itemFactory._rareRoll()).to.be.eq(_rareRoll);
    expect(await itemFactory._epicRoll()).to.be.eq(_epicRoll);
    expect(await itemFactory._legendaryRoll()).to.be.eq(_legendaryRoll);
    expect(await itemFactory._maxRarityRoll()).to.be.eq(_maxRarityRoll);
  });

  it("Should set reward only by users with ADMIN_ROLE", async function () {
    const adminRole = await itemFactory.ADMIN_ROLE();
    let check = await itemFactory.hasRole(adminRole, admin.address);
    console.log("check", check);
    const rewardType = 1;
    const rewardRarity = 2;
    const min = 10;
    const max = 20;
    const ids = [1, 2, 3, 4, 5];
    let rewardData = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "uint256[]"], [min, max, ids]);

    await expect(itemFactory.connect(admin).setReward(rewardType, rewardRarity, rewardData)).to.be.revertedWith(
      `AccessControl: account ${admin.address.toLowerCase()} is missing role ${adminRole}`
    );
  });

  describe("ItemFactory Claim Test", async function () {
    let rewardData;

    beforeEach(async function () {
      const role = await milk.CONTRACT_ROLE();
      await milk.grantRole(role, itemFactory.address);

      const adminRole = await itemFactory.ADMIN_ROLE();
      rewardData = [
        [
          {
            min: 50,
            max: 75,
            ids: [1],
          },
          {
            min: 125,
            max: 200,
            ids: [1, 2, 3],
          },
          {
            min: 300,
            max: 400,
            ids: [1, 2, 5],
          },
          {
            min: 500,
            max: 700,
            ids: [1, 2, 6],
          },
          {
            min: 800,
            max: 900,
            ids: [1, 8],
          },
        ],
        [
          {
            min: 1,
            max: 2,
            ids: [1, 2],
          },
          {
            min: 3,
            max: 5,
            ids: [1, 2, 3],
          },
          {
            min: 7,
            max: 9,
            ids: [1, 2, 3],
          },
          {
            min: 10,
            max: 11,
            ids: [1, 2, 3],
          },
          {
            min: 13,
            max: 15,
            ids: [1, 2, 3],
          },
        ],
      ];

      await itemFactory.grantRole(adminRole, admin.address);

      for (let type = 0; type < 2; type++) {
        for (let rarity = 0; rarity < 5; rarity++) {
          const data = rewardData[type][rarity];
          const bytes = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "uint256[]"], [data.min, data.max, data.ids]);
          await itemFactory.connect(admin).setReward(type, rarity, bytes);
        }
      }
    });

    it("Should not claim twice in a single day", async function () {
      const entropy = 100;
      await itemFactory.connect(user).claim(user.address, entropy);

      const secsPerDay = 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [secsPerDay / 2]);

      await expect(itemFactory.connect(user).claim(user.address, entropy)).to.be.revertedWith("Claimed in the last 24 hours");
    });

    it("Should be able to claim after 24 hours passed", async function () {
      const entropy = 100;
      await itemFactory.connect(user).claim(user.address, entropy);

      const secsPerDay = 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [secsPerDay + 1]);

      await itemFactory.connect(user).claim(user.address, entropy);
    });
  });
});
