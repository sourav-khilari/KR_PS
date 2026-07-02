import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectMongo } from '../config/db.js';
import { OwnerMaster } from '../models/OwnerMaster.js';
import { TruckMaster } from '../models/TruckMaster.js';
import {
  normalizeSeederOwnerKey,
  normalizeSeederOwnerName,
  normalizeSeederPan,
  normalizeSeederTruckNumber
} from '../helpers/masterSeederNormalization.js';
import { MASTER_STATUS } from '../constants/masterData.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../');
const SOURCE_SEED_RUN_ID = 'manual-additional-truck-owner-seed';
const SOURCE_FILE_NAME = 'additional-truck-owner-seed';
const SOURCE_SHEET_NAME = 'inline';

const ownerSeedData = [
  {
    ownerName: 'PAWAN KUMAR SINGH',
    panNumber: 'BIVPS6798F',
    gstApplicable: false,
    truckNumbers: [
      'JH10BW7948','JH10BW1216','JH10N8011','JH10S1621','JH02P2241','JH10AU7405','JH10AW4586','JH10CF9533',
      'JH10BP8733','JH10BP0808','JH10BP7211','JH10AH4702','JH10AL9155','JH10BK5802','JH10BU9957','JH10BL0695',
      'JH10BL4917','JH10CD9850','JH10CD9065','JH10CD7822','JH10CD0832','JH10CD8426','JH10CD8822','JH10CD4965',
      'JH10BZ9616','JH10BZ5593','JH10BZ7466','JH10CG3223','JH10CG7498','JH10CJ0253','JH10CJ9468','JH10CJ4613',
      'JH10CJ4412','JH10CK3675','JH10CK0667','JH10CK0330','JH10CN4139','JH10CN6360','JH10CN6202','JH10CN0939',
      'JH10CQ8745','JH10CQ7507','JH10CQ2291','JH10CQ4356','JH10CS3051','JH10CS6367','JH10CS9284','JH10CV8359',
      'JH10CV0774','JH10CV5985','JH10CV2904','JH10CX1474','JH10CX5255','JH10BT0561','JH10BT5051','JH10CZ8051',
      'JH10CZ6673','JH10CZ4608','JH10CZ6764','JH10DB6677','JH10DB5486','JH10DB4612','JH10DB7973','JH10DB5275',
      'JH10DB4323','JH10DB3312','JH10DB2523','JH10DB5553','JH10DC9366','JH10DC8537','JH10DC6648','JH10DC3051',
      'WB37H7078','WB37H7061','WB37H7098','WB37H7100','JH10DD0431','JH10DD1486','JH10DD2532','JH10DD9723',
      'JH10DD6174','JH10DD4752','JH10CK9283','JH10DJ2065','JH10DH3870','JH02AR0327','JH10CF1859','BR44GA9655',
      'BR44GA9656','BR44GA9657','BR44GA9658','BR44GA9659','BR44GA9660','JH10CP5221','JH10CP2797'
    ]
  },
  {
    ownerName: 'URMILA KUMARI',
    panNumber: 'BRHPK5593B',
    gstApplicable: true,
    truckNumbers: [
      'JH10CX7141','JH10CX0514','JH10BB8557','JH10U9310','JH10AR0417','JH10AU0771','JH10AW8663','JH10BF9678',
      'JH10DD1023','JH10DD6268','JH10DD3265','JH10DD9168','JH10DD3047'
    ]
  },
  {
    ownerName: 'ASHOK KUMAR SINHA HUF',
    panNumber: 'AAWHA4006Q',
    gstApplicable: true,
    truckNumbers: ['JH10DB5735']
  },
  {
    ownerName: 'BALAJI TRANSPORTATION & LOGISTICS',
    panNumber: 'ABEFB6995Q',
    gstApplicable: true,
    truckNumbers: ['JH10DC8969','JH10DE0772','JH10DE0824','JH10DE2279','JH10DC9796']
  },
  {
    ownerName: 'ANJANI KUMAR SINGH',
    panNumber: 'FAKPS9956N',
    gstApplicable: false,
    truckNumbers: ['BR44GA6942','BR44GA5534']
  },
  {
    ownerName: 'RANJIT KUMAR',
    panNumber: 'CHHPK4577Q',
    gstApplicable: false,
    truckNumbers: ['BR26GC5907','BR24GA0111']
  },
  {
    ownerName: 'SAROJ KHAN',
    panNumber: 'BFOPK9833H',
    gstApplicable: true,
    truckNumbers: ['JH10CR3122','JH10CR4110']
  },
  {
    ownerName: 'RAMESH KUMAR JINDAL',
    panNumber: 'ABVPJ9841L',
    gstApplicable: true,
    truckNumbers: ['JH10CQ3188','JH10CQ3088']
  },
  {
    ownerName: 'AJAY KUMAR PANDEY',
    panNumber: 'ASBPP6926B',
    gstApplicable: true,
    truckNumbers: ['JH10DB2705','JH10DH8236']
  },
  {
    ownerName: 'MUKESH KUMAR PANDEY',
    panNumber: 'AXHPP9815C',
    gstApplicable: true,
    truckNumbers: ['JH10DB1693','JH10DH1374']
  },
  {
    ownerName: 'SANOJ KUMAR',
    panNumber: 'CVHPK2934H',
    gstApplicable: false,
    truckNumbers: ['BR10GB3280']
  },
  {
    ownerName: 'VIJAY KUMAR MANDAL',
    panNumber: 'ASWPM2883P',
    gstApplicable: false,
    truckNumbers: ['NL01N4565']
  },
  {
    ownerName: 'VIKASH SINGH YADAV',
    panNumber: 'BDEPY7134D',
    gstApplicable: false,
    truckNumbers: ['BR24GA9529']
  }
];

function normalizeOwnerCandidate(candidate) {
  return {
    ownerName: normalizeSeederOwnerName(candidate.ownerName),
    normalizedOwnerName: normalizeSeederOwnerKey(candidate.ownerName),
    panNumber: normalizeSeederPan(candidate.panNumber),
    gstApplicable: candidate.gstApplicable,
    truckNumbers: [...new Set(candidate.truckNumbers.map(normalizeSeederTruckNumber))]
  };
}

async function findExistingOwners(candidates) {
  const panNumbers = [...new Set(candidates.map((candidate) => candidate.panNumber).filter(Boolean))];
  const normalizedNames = [...new Set(candidates.map((candidate) => candidate.normalizedOwnerName).filter(Boolean))];
  const query = { $or: [] };

  if (panNumbers.length) query.$or.push({ panNumber: { $in: panNumbers } });
  if (normalizedNames.length) query.$or.push({ normalizedOwnerName: { $in: normalizedNames } });
  if (!query.$or.length) return [];

  return OwnerMaster.find(query).lean();
}

async function findExistingTrucks(truckNumbers) {
  const normalizedTrucks = [...new Set(truckNumbers.filter(Boolean))];
  if (!normalizedTrucks.length) return [];
  return TruckMaster.find({ normalizedTruckNumber: { $in: normalizedTrucks } }).lean();
}

async function run() {
  await connectMongo(process.env.MONGODB_URI);

  const normalizedOwners = ownerSeedData.map(normalizeOwnerCandidate);
  const existingOwners = await findExistingOwners(normalizedOwners);

  const ownerByPan = new Map(existingOwners.filter((owner) => owner.panNumber).map((owner) => [owner.panNumber, owner]));
  const ownerByName = new Map(existingOwners.map((owner) => [owner.normalizedOwnerName, owner]));
  const newOwnerByPan = new Map();
  const newOwnerByName = new Map();

  const ownersToInsert = [];
  const ownersByKey = new Map();

  for (const candidate of normalizedOwners) {
    const existingOwner = candidate.panNumber
      ? ownerByPan.get(candidate.panNumber) || newOwnerByPan.get(candidate.panNumber) || ownerByName.get(candidate.normalizedOwnerName) || newOwnerByName.get(candidate.normalizedOwnerName)
      : ownerByName.get(candidate.normalizedOwnerName) || newOwnerByName.get(candidate.normalizedOwnerName);

    if (existingOwner) {
      console.log(`Skipping existing owner candidate: ${candidate.ownerName} (PAN: ${candidate.panNumber || 'N/A'}) -> existing owner: ${existingOwner.ownerName} (PAN: ${existingOwner.panNumber || 'N/A'})`);
      ownersByKey.set(candidate.normalizedOwnerName, existingOwner);
      if (existingOwner.panNumber) ownerByPan.set(existingOwner.panNumber, existingOwner);
      continue;
    }

    const ownerDoc = {
      ownerName: candidate.ownerName,
      normalizedOwnerName: candidate.normalizedOwnerName,
      panNumber: candidate.panNumber || '',
      gstApplicable: candidate.gstApplicable,
      status: MASTER_STATUS.ACTIVE,
      sourceSeedRunId: SOURCE_SEED_RUN_ID,
      sourceFileName: SOURCE_FILE_NAME,
      sourceSheetName: SOURCE_SHEET_NAME,
      sourceRowNumber: null,
      sourceStatus: 'created',
      seededBy: 'manual-seeder',
      seededAt: new Date(),
      createdBy: null,
      updatedBy: null
    };

    ownersToInsert.push(ownerDoc);
    newOwnerByName.set(candidate.normalizedOwnerName, ownerDoc);
    if (candidate.panNumber) {
      newOwnerByPan.set(candidate.panNumber, ownerDoc);
    }
  }

  let insertedOwners = [];
  if (ownersToInsert.length) {
    insertedOwners = await OwnerMaster.insertMany(ownersToInsert, { ordered: false });
    for (const owner of insertedOwners) {
      ownersByKey.set(owner.normalizedOwnerName, owner);
      if (owner.panNumber) ownerByPan.set(owner.panNumber, owner);
    }
  }

  const allOwnerRecords = [...ownersByKey.values()];
  const truckNumbers = [];
  const truckOwnerPairs = [];

  for (const candidate of normalizedOwners) {
    const owner = ownersByKey.get(candidate.normalizedOwnerName);
    if (!owner) continue;

    for (const truckNumber of candidate.truckNumbers) {
      if (!truckNumber) continue;
      const normalizedTruckNumber = normalizeSeederTruckNumber(truckNumber);
      truckOwnerPairs.push({ owner, truckNumber, normalizedTruckNumber });
      truckNumbers.push(normalizedTruckNumber);
    }
  }

  const existingTrucks = await findExistingTrucks(truckNumbers);
  const truckByNumber = new Map(existingTrucks.map((truck) => [truck.normalizedTruckNumber, truck]));

  const trucksToInsert = [];
  const skippedTrucks = [];

  for (const { owner, truckNumber, normalizedTruckNumber } of truckOwnerPairs) {
    const existingTruck = truckByNumber.get(normalizedTruckNumber);
    if (existingTruck) {
      if (String(existingTruck.ownerId) === String(owner._id)) {
        console.log(`Skipping existing truck ${truckNumber} for owner ${owner.ownerName}`);
        continue;
      }
      console.log(`Skipping truck ${truckNumber} for owner ${owner.ownerName}: already mapped to another owner (${existingTruck.ownerId})`);
      skippedTrucks.push({ truckNumber, normalizedTruckNumber, ownerName: owner.ownerName, reason: 'Existing truck mapped to another owner' });
      continue;
    }

    const truckDoc = {
      truckNumber,
      normalizedTruckNumber,
      ownerId: owner._id,
      status: MASTER_STATUS.ACTIVE,
      sourceSeedRunId: SOURCE_SEED_RUN_ID,
      sourceFileName: SOURCE_FILE_NAME,
      sourceSheetName: SOURCE_SHEET_NAME,
      sourceRowNumber: null,
      sourceStatus: 'created',
      seededBy: 'manual-seeder',
      seededAt: new Date(),
      createdBy: null,
      updatedBy: null
    };

    trucksToInsert.push(truckDoc);
    truckByNumber.set(normalizedTruckNumber, truckDoc);
  }

  let insertedTrucks = [];
  if (trucksToInsert.length) {
    insertedTrucks = await TruckMaster.insertMany(trucksToInsert, { ordered: false });
  }

  console.log('Additional truck owner seeding summary:');
  console.log(`  owners processed: ${normalizedOwners.length}`);
  console.log(`  owners created: ${insertedOwners.length}`);
  console.log(`  owners skipped (existing): ${normalizedOwners.length - insertedOwners.length}`);
  console.log(`  trucks processed: ${truckOwnerPairs.length}`);
  console.log(`  trucks created: ${insertedTrucks.length}`);
  console.log(`  trucks skipped (existing or conflict): ${truckOwnerPairs.length - insertedTrucks.length}`);
  if (skippedTrucks.length) {
    console.log('  skipped trucks due to owner mismatch:');
    skippedTrucks.slice(0, 20).forEach((entry) => {
      console.log(`    ${entry.truckNumber} -> ${entry.ownerName}: ${entry.reason}`);
    });
    if (skippedTrucks.length > 20) {
      console.log(`    ...and ${skippedTrucks.length - 20} more`);
    }
  }

  process.exitCode = 0;
}

run().catch((error) => {
  console.error('Failed to seed additional truck owners:', error);
  process.exitCode = 1;
});
