import type { Address } from 'viem'

export const addresses = {
  56: {
    flapTaxTokenImplementation: '0xd7E12EcD6406B993D94F0bC67A4a62681F50AA99',
    tokenFactory: '0x04556cBC53C9E994522b008B676958e715545564',
    presaleImplementation: '0x6b51064d62018DE9832590f1788078BdFB64ACa5',
    presaleFactory: '0x7A6B4da821F4b2aDB1432E06E7B7aD2f20972A1A',
    coordinatorFactory: '0xc7284f96716E4FbB3F794CB407D882C29aA653B1',
  },
  97: {
    flapTaxTokenImplementation: '0x4073e66Ac74e23E6F1B36feb9C230D8757AcF99d',
    tokenFactory: '0x368Bd0Dc6A3f34CD793df007990d439C4105c5E5',
    presaleImplementation: '0xE926faBea1e322C293e0a47b3d26327499c1ac78',
    presaleFactory: '0xaD5ec2fBe2efAC35cCecf4c0348cC62db2C24913',
    coordinatorFactory: '0x63e325d9782DD42915a41673dA2Cc29F8e9B8424',
    buybackVaultImplementation: '0xe028671051f9b9a305848Ea3F7555962011CF01b',
    buybackVaultFactory: '0xE76857D949CF3D159e967265f95f12b78Ad5DCdd',
    dividendImplementation: '0x29e10a8c5a2774F47F50Fa957994Da3851e32567',
    taxInfrastructureFactory: '0xa54A8E779B33784110961D60bDE06445f6E50d7d',
    taxProcessorImplementation: '0x251DfEf4FB9fd06E9163388eB821f58F2d1399c7',
  },
} as const satisfies Record<number, Record<string, Address>>

export type SupportedChainId = keyof typeof addresses
export type DeploymentAddresses = (typeof addresses)[SupportedChainId]
