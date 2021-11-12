// Packages
const fs = require('js-better-fs')
const path = require('path')
const got = require('got')
const slugify = require('slugify')
const datefns = require('date-fns')
const diff = require('fast-diff')

// Folder references
const todayDate = new Date()
const todayDateString = datefns.format(todayDate, 'yyyy-MM-dd')
const rootFolder = 'statements'
const todayFolder = path.join(rootFolder, todayDateString)

// List of URLS to scrape
const statements = [
  {
    desc: 'Craig Abbott Blog',
    url: 'http://localhost:3000/accessibility'
  },
  {
    desc: 'DWP Design System',
    url: 'https://accessibility-manual.dwp.gov.uk/accessibility-statement'
  }
]

// Function for setting folders prior to running stuff
async function folderSetup () {
  // Setup root statements folder
  const statementsExists = await fs.exists(rootFolder)
  if (!statementsExists) await fs.createDir(rootFolder)
  // Setup todays folder
  const todayFolderExists = await fs.exists(todayFolder)
  // If there is no today folder just make it
  if (!todayFolderExists) await fs.createDir(todayFolder)
  // If a today folder already exists clean it
  else {
    await fs.rmDirectory(todayFolder)
    await fs.createDir(todayFolder)
  }
}

// Function for saving scraped html to .html file
async function saveHTML (html, folder, fileName) {
  const saveName = fileName.match(/.html/) ? fileName : `${fileName}.html`
  await fs.writeFile(`${folder}/${saveName}`, html)
}

// Function for scraping an array of URLS and saving the html to a dated folder
async function scrape (statements) {
  for (const statement of statements) {
    const slug = slugify(statement.desc, { lower: true })
    const result = await got(statement.url)
    await saveHTML(result.body, todayFolder, slug)
  }
}

// Function for comparing old files and new files
async function compareFiles () {
  // Get all the dates of the previous scrapes
  const allFilesInRoot = await fs.lsDir(rootFolder)
  const allPreviousScrapes = allFilesInRoot.dirs
  const allPreviousAsDates = []
  for (const i in allPreviousScrapes) {
    const folderName = allPreviousScrapes[i]
    if (folderName !== todayDateString) {
      allPreviousAsDates.push(Date.parse(folderName))
    }
  }

  // Get the files from previous scrape
  const previousDate = datefns.closestTo(todayDate, allPreviousAsDates)
  const previousFolder = path.join(rootFolder, datefns.format(previousDate, 'yyyy-MM-dd'))

  const prevLs = await fs.lsDir(`${previousFolder}`)
  const prevFiles = prevLs.files

  // Get files from todays scrape
  const todayLs = await fs.lsDir(todayFolder)
  const todayFiles = todayLs.files

  // Create an array of files which exist in both folders
  const filesToDiff = []
  for (const file of todayFiles) {
    if (prevFiles.includes(file)) {
      filesToDiff.push(file)
    }
  }

  // Compare the files in the old folder to the files in the new folder
  for (const fileName of filesToDiff) {
    const file1 = fs.readFile(`${previousFolder}/${fileName}`, 'utf8')
    const file2 = fs.readFile(`${todayFolder}/${fileName}`, 'utf8')
    const results = diff(file1, file2)

    // Output removed characters in red and added characters in green
    let newFileTxt = ''
    newFileTxt += `${fileName}\n`

    for (const result of results) {
      if (result[0] === 0) newFileTxt += `<span></span>${result[1]}</span>`
      if (result[0] === 1) newFileTxt += `<span class="added">${result[1]}</span>`
      if (result[0] === -1) newFileTxt += `<span class="removed">${result[1]}</span>`
    }
    newFileTxt += `
      <style>
        * { color:grey; font-size:1rem; font-weight:normal; }
        .added { background:green; color:white; font-weight:bold; font-family:monospace; padding:0 .2em; }
        .removed { background:red; color:white; font-weight:bold; text-decoration:line-through;font-family:monospace; padding:0 .2em; }
      </style>
    `
    await saveHTML(newFileTxt, `output/${todayDateString}`, fileName)
  }
}

// Function for running the tasks in order
async function runTasks () {
  await folderSetup()
  await scrape(statements)
  await compareFiles()
}

// Execute tasks
runTasks()
