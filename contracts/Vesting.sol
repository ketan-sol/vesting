// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Vesting is Ownable {
    enum Roles {
        advisor,
        partner,
        mentor
    }
    Roles public role;

    mapping(uint256 => address[]) public beneficiaries;
    mapping(uint256 => uint256) public tokenReleasedForRole;
    mapping(uint256 => uint256) public totalTokensForRole;

    event startedVesting(uint256 cliff, uint256 duration);
    event addedBeneficiary(address beneficiary, Roles role);
    event withdrawToken(
        uint256 releasedTokenAmount,
        uint256 tokenAmountForEachRole
    );

    IERC20 public token;

    bool public ifVestingStarted;
    uint256 public cliff;
    uint256 public duration;

    constructor(IERC20 _token) {
        token = _token;

        //total tokens = 100mil
        //advisors = 5%
        //partners = 10%
        //mentors = 15%
        totalTokensForRole[uint256(Roles.advisor)] = 5000000000000000000000000;
        totalTokensForRole[uint256(Roles.partner)] = 10000000000000000000000000;
        totalTokensForRole[uint256(Roles.mentor)] = 15000000000000000000000000;
    }

    // start vesting by creating a schedule
    function createSchedule(uint256 _duration, uint256 _cliff)
        external
        onlyOwner
    {
        require(!ifVestingStarted, "Schedule already started");
        require(_duration > 0, "Vesting duration cannot be 0");
        require(_cliff > 0, "Locking period cannot be 0");

        cliff = _cliff + block.timestamp;
        duration = _duration;
        ifVestingStarted = true;

        emit startedVesting(cliff, duration);
    }

    //adding beneficiaries
    function addBeneficiary(address _beneficiary, Roles _role)
        external
        onlyOwner
    {
        require(!ifVestingStarted, "Vesting already started");
        require(_beneficiary != address(0), "Beneficiary address cannot be 0");
        require(
            validateBeneficiary(_beneficiary, _role),
            "Beneficiary already exists"
        );

        beneficiaries[uint256(_role)].push(_beneficiary);

        emit addedBeneficiary(_beneficiary, _role);
    }

    function getBeneficiaries(Roles _role)
        external
        view
        returns (address[] memory)
    {
        return beneficiaries[uint256(_role)];
    }

    function validateBeneficiary(address _beneficiary, Roles _role)
        internal
        view
        returns (bool exists)
    {
        uint256 length = beneficiaries[uint256(_role)].length;
        for (uint256 i = 0; i < length; i++) {
            if (beneficiaries[uint256(_role)][i] == _beneficiary) {
                return false;
            }
        }

        return true;
    }

    function tokenVestedForParticularRole(Roles _role)
        internal
        view
        returns (uint256 tokenVested)
    {
        uint256 totalAmountOfTokens = totalTokensForRole[uint256(_role)];
        if (block.timestamp < cliff) {
            return 0;
        } else if (block.timestamp >= cliff + duration) {
            return totalAmountOfTokens;
        } else {
            return (totalAmountOfTokens * (block.timestamp - cliff)) / duration;
        }
    }

    function withdraw(Roles _role) external onlyOwner {
        require(ifVestingStarted == true, "No vesting schedule started");
        uint256 vestedTokens = tokenVestedForParticularRole(_role);
        require(
            totalTokensForRole[uint256(_role)] !=
                tokenReleasedForRole[uint256(_role)],
            "Tokens already generated for this role"
        );

        uint256 tokenNotReleasedForRole = vestedTokens -
            tokenReleasedForRole[uint256(_role)];

        uint256 length = beneficiaries[uint256(_role)].length;

        uint256 tokenAmountForEachRole = tokenNotReleasedForRole / length;

        require(tokenAmountForEachRole > 0, "No tokens left for release");

        uint256 tokenLeft = tokenNotReleasedForRole % length;

        tokenReleasedForRole[uint256(_role)] += (tokenNotReleasedForRole -
            tokenLeft);

        for (uint256 i = 0; i < length; i++) {
            token.transfer(
                beneficiaries[uint256(_role)][i],
                tokenAmountForEachRole
            );
        }

        emit withdrawToken(tokenNotReleasedForRole, tokenAmountForEachRole);
    }
}
