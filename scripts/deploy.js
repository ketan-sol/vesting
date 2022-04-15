// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require('hardhat');
const hre = require('hardhat');
const { BigNumber } = require('ethers');

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const initialSupply = 100000000; //100 mil

  const [deployer] = await ethers.getSigners();
  const Token = await ethers.getContractFactory('MyToken');
  const Vesting = await ethers.getContractFactory('Vesting');

  const token = await Token.deploy('MyToken', 'MTK', initialSupply);
  console.log('My Token address:', token.address);

  const vesting = await Vesting.deploy(token.address);
  console.log('Vesting address:', vesting.address);

  const totalSupply = await token.totalSupply();

  //30% of total is for vesting
  //30% => 5% advisors + 10% partners + 15% mentors
  const vestedAmount = BigNumber.from(totalSupply)
    .mul(BigNumber.from(30))
    .div(BigNumber.from(100));

  await token.transfer(vesting.address, vestedAmount);
  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account Balance:', (await deployer.getBalance()).toString());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
