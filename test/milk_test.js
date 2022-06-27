const { expect } = require("chai");

describe("Milk Contract Test", async function () {
  let milk;

  beforeEach(async function () {
    const Milk = await ethers.getContractFactory("Milk");
    milk = await Milk.deploy("MilkReward", "MLK");
    await milk.deployed();
  });

  it("Only deployer address gets DEFAULT_ADMIN_ROLE, no one else can", async function () {
    const [deployer, another] = await ethers.getSigners();

    const role = await milk.DEFAULT_ADMIN_ROLE();
    let hasRole = await milk.hasRole(role, deployer.address);
    expect(hasRole).to.be.eq(true);
    hasRole = await milk.hasRole(role, another.address);
    expect(hasRole).to.be.eq(false);
  });

  describe("Deposit MLK Test", async function () {
    it("DEPOSITOR_ROLE only allowed to deposit", async function () {
      const [depositor, user] = await ethers.getSigners();

      const depositorRole = await milk.DEPOSITOR_ROLE();
      const depositAmount = ethers.utils.parseUnits("20", 18);

      await expect(
        milk.connect(depositor).deposit(user.address, depositAmount)
      ).to.be.revertedWith(
        `AccessControl: account ${depositor.address.toLowerCase()} is missing role ${depositorRole}`
      );

      await milk.grantRole(depositorRole, depositor.address);
      await milk
        .connect(depositor)
        .deposit(
          user.address,
          ethers.utils.defaultAbiCoder.encode(["uint256"], [depositAmount])
        );

      const milkBalance = await milk.balanceOf(user.address);
      expect(milkBalance).to.be.eq(depositAmount);
    });
  });

  describe("Withdrawal Tests", async function () {
    beforeEach(async function () {
      const [depositor, user] = await ethers.getSigners();

      const depositorRole = await milk.DEPOSITOR_ROLE();
      const depositAmount = ethers.utils.parseUnits("100", 18);

      await expect(
        milk.connect(depositor).deposit(user.address, depositAmount)
      ).to.be.revertedWith(
        `AccessControl: account ${depositor.address.toLowerCase()} is missing role ${depositorRole}`
      );

      await milk.grantRole(depositorRole, depositor.address);

      await milk
        .connect(depositor)
        .deposit(
          user.address,
          ethers.utils.defaultAbiCoder.encode(["uint256"], [depositAmount])
        );
    });

    it("Withdrawal more than balance to fail", async function () {
      const [depositor, user] = await ethers.getSigners();
      const withdrawAmount = ethers.utils.parseUnits("200", 18);

      await expect(
        milk.connect(user).withdraw(withdrawAmount)
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });

    it("Withdrawal possible up to the account balance", async function () {
      const [depositor, user] = await ethers.getSigners();
      const withdrawAmount = ethers.utils.parseUnits("30", 18);

      const beforeBalance = await milk.balanceOf(user.address);
      await milk.connect(user).withdraw(withdrawAmount);
      const afterBalance = await milk.balanceOf(user.address);

      expect(afterBalance).to.be.eq(beforeBalance.sub(withdrawAmount));
    });
  });
});
