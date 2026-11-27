import type { Address } from 'viem'

export const addresses = {
  56: {
    flapTaxTokenImplementation: '0x4EeBdf2B4bb94A2019bd04e0a6724eC9a1b018B6',
    tokenFactory: '0x9d132C13B24b9CaDa74dAbE11f4D3DE0f1814F2c',
    presaleImplementation: '0xC4fD2511c583B4Ce6D8209406875a4c92b6184b0',
    presaleFactory: '0xBD1eFD77acA6dC8B00fc051fB977e1D4373FE5a2',
    coordinatorFactory: '0xf5723650A64a7b3F05D1544d540E77C57EcDD94D',
    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    buybackVaultImplementation: '0xcC31Ff9bE3091cF147b57501fFa39956AEf303Ce',
    buybackVaultFactory: '0xc027DaD66C7dF259953932B10b66Fad991889b86',
    dividendImplementation: '0x8EEDFE0445ec4849E752F6B18283eD01D81b8ddb',
    taxInfrastructureFactory: '0x505B02Eb32c545489B64d29A660AEcC3bE79965F',
    taxProcessorImplementation: '0x8d5E672cBa2ae731f887C08AfAb1F4980ABa4B87',
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
