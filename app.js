// Packages
const fs = require('js-better-fs')
const path = require('path')
const got = require('got')
const slugify = require('slugify')
const datefns = require('date-fns')
const diff = require('fast-diff')
const colours = require('colors')

// Folder references
const date = datefns.format(new Date(), 'yyyy-MM-dd')
const rootFolder = 'statements'
const todayFolder = path.join(rootFolder, date)

// List of URLS to scrape
const statements = [
  {
    desc: 'Craig Abbott Blog',
    url: 'http://localhost:3000/accessibility'
  }
]

// Function for setting folders prior to running stuff
async function folderSetup () {
  // Setup root statements folder
  const statementsExists = await fs.exists(rootFolder)
  if (!statementsExists) await fs.createDir(rootFolder)
  // Setup todays folder
  const todayFolderExists = await fs.exists(todayFolder)
  if (!todayFolderExists) await fs.createDir(todayFolder)
  else {
    await fs.rmDirectory(todayFolder)
    await fs.createDir(todayFolder)
  }
}

// Function for saving scraped html to .html file
async function saveHTML (html, slug) {
  const filename = `${todayFolder}/${slug}.html`
  await fs.writeFile(filename, html)
}

// Function for scraping an array of URLS and saving the html to a dated folder
async function scrape (statements) {
  for (const statement of statements) {
    const slug = slugify(statement.desc, { lower: true })
    const result = await got(statement.url)
    await saveHTML(result.body, slug)
  }
}

// Function for comparing old files and new files
async function compareFiles () {
  // Get get the files from previous scrape
  // Hard coded in previous example, needs more work
  const prevLs = await fs.lsDir('statements/2021-11-11')
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
    const file1 = fs.readFile(`statements/2021-11-11/${fileName}`, 'utf8')
    const file2 = fs.readFile(`statements/2021-11-12/${fileName}`, 'utf8')
    const results = diff(file1, file2)

    // Output removed characters in red and added characters in green
    for (const result of results) {
      if (result[0] === 1) console.log(colours.green(result[1]))
      if (result[0] === -1) console.log(colours.red(result[1]))
    }
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
