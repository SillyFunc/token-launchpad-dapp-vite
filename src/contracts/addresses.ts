import type { Address } from 'viem'

export const addresses = {
  56: {
    flapTaxTokenImplementation: '0x6980190344e6E485119039C9DC6bEC7971E28BC2',
    tokenFactory: '0x0AA8E4edd3D00275B464daC30ac618a2aF14305a',
    presaleImplementation: '0x9CA45c3aE5A9Ca8cCf3f09E4B91B48c52eF23CeD',
    presaleFactory: '0x350597F41B981cf5493a0d387FeD8646b76A0AFb',
    coordinatorFactory: '0xb73bdF3E86737F64E6f624112069F9D282a68e35',
    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    buybackVaultImplementation: '0x193335e9C56b4F34466b9FF66E9fB3D72dE685Bf',
    buybackVaultFactory: '0x81E3a74e859248737E43d60Fc1D66F44a203aBc5',
    dividendImplementation: '0x53E6E5487D954AF595532b0D0660bBCd06Db8bFC',
    taxInfrastructureFactory: '0x7f28Ebdc94301D349C5CD1924A7dE3d6BD7b74A6',
    taxProcessorImplementation: '0xeD32EEf193Cf589c4abFA76e19d6A35614F8bA0d',
  },
  97: {
    flapTaxTokenImplementation: '0x4073e66Ac74e23E6F1B36feb9C230D8757AcF99d',
    tokenFactory: '0x368Bd0Dc6A3f34CD793df007990d439C4105c5E5',
    presaleImplementation: '0xE926faBea1e322C293e0a47b3d26327499c1ac78',
    presaleFactory: '0xaD5ec2fBe2efAC35cCecf4c0348cC62db2C24913',
    coordinatorFactory: '0x63e325d9782DD42915a41673dA2Cc29F8e9B8424',
    router: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
    buybackVaultImplementation: '0xe028671051f9b9a305848Ea3F7555962011CF01b',
    buybackVaultFactory: '0xE76857D949CF3D159e967265f95f12b78Ad5DCdd',
    dividendImplementation: '0x29e10a8c5a2774F47F50Fa957994Da3851e32567',
    taxInfrastructureFactory: '0xa54A8E779B33784110961D60bDE06445f6E50d7d',
    taxProcessorImplementation: '0x251DfEf4FB9fd06E9163388eB821f58F2d1399c7',
  },
} as const satisfies Record<number, Record<string, Address>>

export type SupportedChainId = keyof typeof addresses
export type DeploymentAddresses = (typeof addresses)[SupportedChainId]
