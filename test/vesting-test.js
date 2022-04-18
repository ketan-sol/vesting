const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { ethers } = require('hardhat');

describe('Vesting', () => {
  let deployer;
  let addr1;
  let addr2;
  let addrs;
  let Token;
  let Vesting;
  let token;
  let vesting;

  const initialTokenSupply = 100000000; //100 million

  //cliff = 2 days
  const cliff = 24 * 60 * 60 * 2; //in seconds

  //vesting period =  10 days
  const duration = 24 * 60 * 60 * 10;

  //roles :
  //0=advisors
  //1=partners
  //2=mentors

  const addBeneficiaryRoles = async (addrs) => {
    for (let i = 0; i < 15; i++) {
      if (i < 5) {
        await vesting.addBeneficiary(addrs[i].address, 0); //advisor
      } else if (i < 10) {
        vesting.addBeneficiary(addrs[i].address, 1); //partner
      } else {
        vesting.addBeneficiary(addrs[i].address, 2); //mentor
      }
    }
  };
  before(async function () {
    Token = await ethers.getContractFactory('MyToken');
    Vesting = await ethers.getContractFactory('Vesting');
  });

  beforeEach(async () => {
    [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();
    token = await Token.deploy('MyToken', 'MTK', initialTokenSupply);
    await token.deployed();
    vesting = await Vesting.deploy(token.address);
    await vesting.deployed();

    const totalSupply = await token.totalSupply();

    //30% of total is for vesting
    //30% => 5% advisors + 10% partners + 15% mentors

    const vestedAmount = BigNumber.from(totalSupply)
      .mul(BigNumber.from(30))
      .div(BigNumber.from(100));

    //sending token to vesting contract
    await token.transfer(vesting.address, vestedAmount);
  });

  it('should have tokens for vesting', async () => {
    const Roles = 3;
    let vestedTokensForRoles = BigNumber.from(0);
    for (i = 0; i < Roles; i++) {
      const tokenVestedForEachRole = await vesting.totalTokensForRole(i);
      vestedTokensForRoles = BigNumber.from(vestedTokensForRoles).add(
        BigNumber.from(tokenVestedForEachRole)
      );
    }

    const balance = await token.balanceOf(vesting.address);
    expect(balance).to.be.equal(vestedTokensForRoles);
  });

  it('only owner should be able to add beneficiaries', async () => {
    await expect(
      vesting.connect(addr1).addBeneficiary(addrs[0].address, 0)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should be able to add beneficiary', async () => {
    await expect(vesting.addBeneficiary(addr1.address, 0)).to.emit(
      vesting,
      'addedBeneficiary'
    );
  });

  it('cannot add beneficiary of same role twice', async () => {
    await vesting.addBeneficiary(addr1.address, 0);
    await expect(vesting.addBeneficiary(addr1.address, 0)).to.be.revertedWith(
      'Beneficiary already exists'
    );
  });

  it('only owner can start vesting schedule', async () => {
    await expect(
      vesting.connect(addr1).createSchedule(cliff, duration)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should check if vesting started or not', async () => {
    await vesting.createSchedule(cliff, duration);
    await expect(vesting.createSchedule(cliff, duration)).to.be.revertedWith(
      'Schedule already started'
    );
  });

  it('should assign address to roles', async () => {
    await addBeneficiaryRoles(addrs);

    expect(await vesting.beneficiaries(0, 0)).to.be.equal(addrs[0].address); //advisor
    expect(await vesting.beneficiaries(1, 0)).to.be.equal(addrs[5].address); //partner
    expect(await vesting.beneficiaries(2, 0)).to.be.equal(addrs[10].address); //mentor
  });

  it('should not be able to withdraw token in cliff period or genereated amount is 0', async () => {
    await addBeneficiaryRoles(addrs);
    await vesting.createSchedule(cliff, duration);
    await expect(vesting.withdraw(0)).to.be.revertedWith(
      'No tokens left for release'
    );
  });

  it('should be able to withdraw token after cliff period', async () => {
    await addBeneficiaryRoles(addrs);
    await vesting.createSchedule(cliff, duration);
    await ethers.provider.send('evm_increaseTime', [cliff + 24 * 60 * 60 * 1]); //1day =24*60*60 seconds
    await ethers.provider.send('evm_mine');
    console.log(await vesting.tokenVestedForParticularRole(0));
    await expect(vesting.withdraw(0)).to.emit(vesting, 'withdrawToken');
  });

  it('should receive token after withdrawl', async () => {
    await addBeneficiaryRoles(addrs);
    await vesting.createSchedule(cliff, duration);
    await ethers.provider.send('evm_increaseTime', [cliff + duration / 2]);
    await ethers.provider.send('evm_mine');
    const contractBalanceBeforeWithdrawal = await token.balanceOf(
      vesting.address
    );
    const allAdvisors = await vesting.getBeneficiaries(0);
    const balanceOfOneAdvisorBeforeWithdrawal = await token.balanceOf(
      allAdvisors[0]
    );
    const balanceOfAllAdvisorsBeforeWithdrawal = BigNumber.from(
      balanceOfOneAdvisorBeforeWithdrawal
    ).mul(BigNumber.from(allAdvisors.length));

    await vesting.withdraw(0);

    const contractBalanceAfterWithdrawal = await token.balanceOf(
      vesting.address
    );
    const balanceOfOneAdvisorAfterWithdrawal = await token.balanceOf(
      allAdvisors[0]
    );
    const balanceOfAllAdvisorAfterWithdrawal = BigNumber.from(
      balanceOfOneAdvisorAfterWithdrawal
    ).mul(BigNumber.from(allAdvisors.length));

    const changeInAdvisorBalance = BigNumber.from(
      balanceOfAllAdvisorAfterWithdrawal
    ).sub(BigNumber.from(balanceOfAllAdvisorsBeforeWithdrawal));
    const changeInContractBalance = BigNumber.from(
      contractBalanceBeforeWithdrawal
    ).sub(BigNumber.from(contractBalanceAfterWithdrawal));

    expect(changeInContractBalance).to.be.equal(changeInAdvisorBalance);
  });

  it('each role address should get equal tokens', async () => {
    await addBeneficiaryRoles(addrs);
    await vesting.createSchedule(cliff, duration);
    await ethers.provider.send('evm_increaseTime', [cliff + duration / 2]);
    await ethers.provider.send('evm_mine');
    await vesting.withdraw(0);
    const advisor1 = await vesting.beneficiaries(0, 0);
    const advisor4 = await vesting.beneficiaries(0, 3);
    expect(await token.balanceOf(advisor1)).to.be.equal(
      await token.balanceOf(advisor4)
    );
  });
});
