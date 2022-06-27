async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const Milk = await ethers.getContractFactory("Milk");
  const milk = await Milk.deploy("MilkRewardToken", "MLK");
  console.log("Deploying MilkReward to:", milk.address);
  await milk.deployed();
  console.log("MilkReward token deployed");

  const ItemFactory = await ethers.getContractFactory("ItemFactory");
  const itemFactory = await ItemFactory.deploy("hostingsite/{id}.json", milk.address);
  console.log("Deploying ItemFactory to:", itemFactory.address);
  await itemFactory.deployed();
  console.log("ItemFactory deployed");

  const contractRole = await milk.CONTRACT_ROLE();
  await milk.grantRole(contractRole, itemFactory.address);
  console.log("Set CONTRACT_ROLE  of itemFactory contract address in the Milk contract");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
