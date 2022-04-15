const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("MyERC20vesting Contract", () => {
  let deployer;
  let addr1;
  let addr2;
  let addrs;
  let Token;
  let Vesting;
  let token;
  let vesting;

  const initialTokenSupply = 100000000; //100 million

  //cliff of vesting contract 2 days
  const cliff = 24 * 60 * 60 * 2; //2 days cliff in seconds
  //duration of Linear vesting 10 days
  const duration = 24 * 60 * 60 * 10;

  //roles = 0(advisors),1(partners),2(mentors)

  const addAllBeneficiariesRoles = async (addrs) => {
    //adding 5 addresses in each role
    for (let i = 0; i < 15; i++) {
      if (i < 5) {
        // role 0 = advisor
        await vesting.addBeneficiary(addrs[i].address, 0);
      } else if (i < 10) {
        // role 1 = partner
        vesting.addBeneficiary(addrs[i].address, 1);
      } else {
        //role 2 = mentor
        vesting.addBeneficiary(addrs[i].address, 2);
      }
    }
  };