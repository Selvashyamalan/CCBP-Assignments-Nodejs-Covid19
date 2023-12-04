const express = require('express')
const app = express()
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const dbPath = path.join(__dirname, 'covid19India.db')
app.use(express.json())
let db = null

const iniitalizeServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('server is running')
    })
  } catch (e) {
    console.log(`DB Error Occured: ${e.message}`)
    process.exit(1)
  }
}

iniitalizeServer()

const convertStateObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

const convertDistrictToObject = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

app.get('/states/', async (request, response) => {
  const getStates = `
    SELECT * FROM state;`
  const stateTable = await db.all(getStates)
  response.send(stateTable.map(each => convertStateObject(each)))
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getSingle = `
  SELECT * FROM state
  WHERE state_id = "${stateId}";`
  const getSingleState = await db.get(getSingle)
  response.send(convertStateObject(getSingleState))
})

app.post('/districts/', async (request, response) => {
  const createDistrict = request.body
  const {districtName, stateId, cases, cured, active, deaths} = createDistrict
  const newDistrict = `
  INSERT INTO district(district_name, state_id, cases, cured, active, deaths)
  VALUES('${districtName}',${stateId},
  ${cases}, ${cured}, ${active}, ${deaths});`
  const addDistrict = await db.run(newDistrict)
  const districtId = addDistrict.lastId
  response.send('District Successfully Added')
})

app.get('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params
  const getDistrict = `
  SELECT * FROM district
  WHERE district_id = '${districtId}';`
  const SingleDistrict = await db.get(getDistrict)
  response.send(convertDistrictToObject(SingleDistrict))
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteDistrict = `
  DELETE FROM district
  WHERE district_id = '${districtId}';`
  await db.run(deleteDistrict)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const updateDistrict = `
  UPDATE district 
  SET district_name = '${districtName}',
  state_id = ${stateId},
  cases = ${cases},
  cured = ${cured},
  active = ${active},
  deaths = ${deaths}
  WHERE district_id = '${districtId}';`
  await db.run(updateDistrict)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getReport = `
  SELECT SUM(cases),
  SUM(cured),
  SUM(active),
  SUM(deaths)
  FROM district
  WHERE state_id = '${stateId}';`
  const stats = await db.get(getReport)
  response.send({
    totalCases: stats['SUM(cases)'],
    totalCured: stats['SUM(cured)'],
    totalActive: stats['SUM(active)'],
    totalDeaths: stats['SUM(deaths)'],
  })
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const stateDetails = `
  SELECT state_name FROM state JOIN district
  ON state.state_id = district.state_id
  WHERE district_id = '${districtId}';`
  const stateName = await db.get(stateDetails)
  response.send({stateName: stateName.state_name})
})

module.exports = app
