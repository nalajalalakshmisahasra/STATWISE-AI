/**
 * Seed data: demo users, competency framework, role requirements, learning resources,
 * case studies, assessment questions, a sample grounded quiz, integration status.
 * All records are synthetic and labelled per PRD §7/§11.
 */
const db = require('./db')

function seedIfEmpty () {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n
  if (count > 0) return

  const insertUser = db.prepare('INSERT INTO users (email, name, role, language) VALUES (?, ?, ?, ?)')
  const users = [
    ['arjun.mehta@demo.statwise.in', 'Arjun Mehta', 'learner', 'en'],
    ['priya.nair@demo.statwise.in', 'Priya Nair', 'learner', 'en'],
    ['rahul.verma@demo.statwise.in', 'Rahul Verma', 'learner', 'en'],
    ['sana.khan@demo.statwise.in', 'Sana Khan', 'learner', 'en'],
    ['meera.iyer@demo.statwise.in', 'Meera Iyer', 'trainer', 'en'],
    ['vikram.rao@demo.statwise.in', 'Vikram Rao', 'trainer', 'en'],
    ['kavya.sharma@demo.statwise.in', 'Kavya Sharma', 'admin', 'en']
  ]
  const ids = {}
  for (const [email, name, role, language] of users) {
    ids[name] = insertUser.run(email, name, role, language).lastInsertRowid
  }

  const insertProfile = db.prepare(`INSERT INTO learner_profiles
    (user_id, department, designation, job_role, assignment, education, experience_years, previous_training, interests, self_reported_skills)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const profiles = [
    [ids['Arjun Mehta'], 'National Accounts Division', 'Assistant Director', 'Economic Statistician', 'GDP compilation', 'M.Sc. Statistics', 4, 'NSSTA Foundation Course', 'National Accounts, Python', 'Sampling:Proficient;SQL:Developing'],
    [ids['Priya Nair'], 'Field Operations Division', 'Field Investigator', 'Survey Statistician', 'PLFS field survey', 'B.Sc. Mathematics', 2, 'iGOT Orientation', 'Survey design, Telugu content', 'Survey Design:Developing;Data Visualization:Beginner'],
    [ids['Rahul Verma'], 'CSO Industrial Statistics', 'Research Officer', 'Industrial Statistician', 'ASI processing', 'M.Sc. Applied Statistics', 7, 'NSSTA Sampling Workshop', 'Data quality, R', 'R:Proficient;Data Quality Frameworks:Developing'],
    [ids['Sana Khan'], 'SDG Cell, MoSPI', 'Junior Consultant', 'SDG Data Analyst', 'SDG indicator reporting', 'M.A. Economics', 3, 'None', 'SDG indicators, AI/ML', 'SDG Indicators:Developing;Python:Beginner']
  ]
  for (const p of profiles) insertProfile.run(...p)

  const insertTA = db.prepare('INSERT INTO trainer_assignments (trainer_id, learner_id, cohort) VALUES (?, ?, ?)')
  insertTA.run(ids['Meera Iyer'], ids['Arjun Mehta'], 'NES-2026 Cohort A')
  insertTA.run(ids['Meera Iyer'], ids['Priya Nair'], 'NES-2026 Cohort A')
  insertTA.run(ids['Vikram Rao'], ids['Rahul Verma'], 'Industry Stats Program')
  insertTA.run(ids['Vikram Rao'], ids['Sana Khan'], 'Industry Stats Program')

  const insertComp = db.prepare('INSERT INTO competencies (code, name, domain, description) VALUES (?, ?, ?, ?)')
  const comps = [
    ['SURVEY_DESIGN', 'Survey Design', 'Statistical', 'Planning surveys: frames, instruments, modes, and quality standards.'],
    ['SAMPLING', 'Sampling', 'Statistical', 'Sample selection, stratification, weighting, and variance estimation.'],
    ['NATIONAL_ACCOUNTS', 'National Accounts', 'Statistical', 'Compiling GDP, supply-use tables, and macroeconomic aggregates.'],
    ['PRICE_STATS', 'Price Statistics', 'Statistical', 'CPI/WPI/IIP price collection, index construction, and rebasing.'],
    ['LABOUR_STATS', 'Labour Statistics', 'Statistical', 'Employment, unemployment, PLFS, and labour-force measurement.'],
    ['AGRI_STATS', 'Agricultural Statistics', 'Statistical', 'Crop-area, yield estimation, and agricultural censuses.'],
    ['INDUSTRIAL_STATS', 'Industrial Statistics', 'Statistical', 'ASI, IIP, and industrial production measurement.'],
    ['SDG_INDICATORS', 'SDG Indicators', 'Statistical', 'Global indicator framework, disaggregation, and reporting.'],
    ['METADATA', 'Metadata Standards', 'Statistical', 'GSBPM, SDMX, and metadata management.'],
    ['DATA_QUALITY', 'Data Quality Frameworks', 'Statistical', 'Quality assurance, editing, imputation, and validation.'],
    ['PYTHON', 'Python', 'Technical', 'Data manipulation, analysis, and automation with Python.'],
    ['R_LANG', 'R', 'Technical', 'Statistical computing and reproducible analysis in R.'],
    ['SQL', 'SQL', 'Technical', 'Relational queries, joins, and analytical SQL.'],
    ['STATA', 'Stata', 'Technical', 'Econometric and survey analysis in Stata.'],
    ['SPSS', 'SPSS', 'Technical', 'Survey processing and descriptive analytics in SPSS.'],
    ['SAS', 'SAS', 'Technical', 'Enterprise analytics and data management in SAS.'],
    ['GIS', 'GIS', 'Technical', 'Spatial data handling and cartography.'],
    ['DATA_VIZ', 'Data Visualization', 'Technical', 'Charts, dashboards, and clear visual communication.'],
    ['AI_ML', 'AI/ML', 'Technical', 'Machine-learning literacy for official statistics.'],
    ['CLOUD', 'Cloud Computing', 'Technical', 'Cloud concepts and secure government data handling.'],
    ['APIS', 'APIs', 'Technical', 'Data exchange and open-data APIs.'],
    ['OPEN_DATA', 'Open Data', 'Technical', 'Open-data publication standards and licensing.']
  ]
  const compIds = {}
  for (const [code, name, domain, description] of comps) {
    compIds[code] = insertComp.run(code, name, domain, description).lastInsertRowid
  }

  const insertReq = db.prepare('INSERT INTO role_competency_requirements (job_role, competency_id, expected_level, relevance) VALUES (?, ?, ?, ?)')
  const reqs = [
    ['Economic Statistician', 'NATIONAL_ACCOUNTS', 'Proficient', 'core'],
    ['Economic Statistician', 'PRICE_STATS', 'Proficient', 'core'],
    ['Economic Statistician', 'SAMPLING', 'Proficient', 'core'],
    ['Economic Statistician', 'PYTHON', 'Developing', 'supporting'],
    ['Economic Statistician', 'SQL', 'Developing', 'supporting'],
    ['Economic Statistician', 'DATA_QUALITY', 'Developing', 'supporting'],
    ['Economic Statistician', 'DATA_VIZ', 'Developing', 'supporting'],
    ['Survey Statistician', 'SURVEY_DESIGN', 'Proficient', 'core'],
    ['Survey Statistician', 'SAMPLING', 'Advanced', 'core'],
    ['Survey Statistician', 'LABOUR_STATS', 'Proficient', 'core'],
    ['Survey Statistician', 'DATA_VIZ', 'Developing', 'supporting'],
    ['Survey Statistician', 'SQL', 'Developing', 'supporting'],
    ['Industrial Statistician', 'INDUSTRIAL_STATS', 'Proficient', 'core'],
    ['Industrial Statistician', 'SAMPLING', 'Proficient', 'core'],
    ['Industrial Statistician', 'DATA_QUALITY', 'Proficient', 'core'],
    ['Industrial Statistician', 'R_LANG', 'Developing', 'supporting'],
    ['Industrial Statistician', 'METADATA', 'Developing', 'supporting'],
    ['SDG Data Analyst', 'SDG_INDICATORS', 'Proficient', 'core'],
    ['SDG Data Analyst', 'DATA_QUALITY', 'Developing', 'supporting'],
    ['SDG Data Analyst', 'DATA_VIZ', 'Proficient', 'core'],
    ['SDG Data Analyst', 'PYTHON', 'Developing', 'supporting'],
    ['SDG Data Analyst', 'OPEN_DATA', 'Developing', 'supporting']
  ]
  for (const [role, code, level, relevance] of reqs) insertReq.run(role, compIds[code], level, relevance)

  const insertRes = db.prepare(`INSERT INTO learning_resources
    (title, competency_id, provider, source_type, resource_type, duration_hours, outcome, url, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const resources = [
    ['Designing Household Survey Questionnaires', 'SURVEY_DESIGN', 'iGOT Karmayogi (sample)', 'demo', 'course', 6, 'Draft a survey instrument meeting quality standards', 'https://igot.example.gov.in/survey-design', 'Sample module on instrument design, testing, and field protocols.'],
    ['Advanced Sampling Techniques', 'SAMPLING', 'NSSTA/TPAC (sample)', 'demo', 'course', 12, 'Apply stratified multistage designs and estimate variances', 'https://nssta.example.gov.in/sampling', 'Sample programme covering complex survey designs.'],
    ['Sampling Foundations Workshop', 'SAMPLING', 'NSSTA/TPAC (sample)', 'demo', 'course', 8, 'Select appropriate designs for official surveys', 'https://nssta.example.gov.in/sampling-basics', 'Introductory workshop with PLFS-style exercises.'],
    ['System of National Accounts Basics', 'NATIONAL_ACCOUNTS', 'NSSTA/TPAC (sample)', 'demo', 'course', 10, 'Explain SNA aggregates and their compilation', 'https://nssta.example.gov.in/sna-basics', 'Sample course on GDP measurement approaches.'],
    ['CPI Compilation in Practice', 'PRICE_STATS', 'Internal (sample)', 'demo', 'course', 5, 'Compute elementary indices and handle item replacement', 'https://statwise.demo/cpi-practice', 'Internal sample module on index construction.'],
    ['PLFS Field Operations Guide', 'LABOUR_STATS', 'Internal (sample)', 'demo', 'reading', 3, 'Apply field protocols for labour surveys', 'https://statwise.demo/plfs-guide', 'Sample reading with roster and enumeration exercises.'],
    ['Crop Yield Estimation Methods', 'AGRI_STATS', 'NSSTA/TPAC (sample)', 'demo', 'course', 7, 'Choose yield estimation methods for crops', 'https://nssta.example.gov.in/agri-yield', 'Sample course on crop-cutting experiments.'],
    ['ASI Data Processing Clinic', 'INDUSTRIAL_STATS', 'Internal (sample)', 'demo', 'module', 6, 'Process ASI returns with validation rules', 'https://statwise.demo/asi-clinic', 'Sample module on editing and validation of ASI data.'],
    ['SDG Indicator Framework Overview', 'SDG_INDICATORS', 'iGOT Karmayogi (sample)', 'demo', 'course', 4, 'Map indicators to data sources and tiers', 'https://igot.example.gov.in/sdg-framework', 'Sample course on the global indicator framework.'],
    ['Metadata Management with SDMX', 'METADATA', 'iGOT Karmayogi (sample)', 'demo', 'course', 6, 'Structure metadata using SDMX standards', 'https://igot.example.gov.in/sdmx', 'Sample module on structural metadata.'],
    ['Data Quality Assessment Framework', 'DATA_QUALITY', 'Internal (sample)', 'demo', 'course', 5, 'Run a quality assessment using a standard framework', 'https://statwise.demo/dqaf', 'Sample course based on DQAF principles.'],
    ['Python for Official Statistics', 'PYTHON', 'Internal (sample)', 'demo', 'course', 8, 'Automate a data-validation workflow in Python', 'https://statwise.demo/python-official-stats', 'Hands-on sample course with pandas exercises.'],
    ['R for Statistical Analysis', 'R_LANG', 'Internal (sample)', 'demo', 'course', 8, 'Build a reproducible analysis in R', 'https://statwise.demo/r-analysis', 'Sample course covering tidyverse fundamentals.'],
    ['SQL for Data Officers', 'SQL', 'Internal (sample)', 'demo', 'course', 5, 'Write analytical queries with joins and windows', 'https://statwise.demo/sql-officers', 'Sample course on practical SQL.'],
    ['Data Visualization with Purpose', 'DATA_VIZ', 'iGOT Karmayogi (sample)', 'demo', 'course', 4, 'Design charts that communicate official statistics', 'https://igot.example.gov.in/dataviz', 'Sample course on visualization practice.'],
    ['Introduction to Machine Learning for NSO Staff', 'AI_ML', 'NSSTA/TPAC (sample)', 'demo', 'course', 6, 'Assess where ML fits in statistical production', 'https://nssta.example.gov.in/ml-intro', 'Sample course on ML concepts and governance.'],
    ['Stata for Survey Analysis', 'STATA', 'NSSTA/TPAC (sample)', 'demo', 'course', 6, 'Estimate survey statistics with proper weights', 'https://nssta.example.gov.in/stata-survey', 'Sample course using Stata svyset workflows.'],
    ['SPSS Basics for Field Data', 'SPSS', 'Internal (sample)', 'demo', 'course', 4, 'Clean and tabulate field data in SPSS', 'https://statwise.demo/spss-basics', 'Sample module on SPSS workflows.'],
    ['SAS Foundations', 'SAS', 'Internal (sample)', 'demo', 'course', 6, 'Manage and analyse datasets in SAS', 'https://statwise.demo/sas-foundations', 'Sample course on SAS programming.'],
    ['GIS for Census Mapping', 'GIS', 'Internal (sample)', 'demo', 'course', 5, 'Prepare enumeration-block maps with GIS tools', 'https://statwise.demo/gis-census', 'Sample course on spatial workflows.'],
    ['APIs and Open Data Publishing', 'APIS', 'iGOT Karmayogi (sample)', 'demo', 'course', 3, 'Publish a machine-readable open-data API', 'https://igot.example.gov.in/open-data-apis', 'Sample module on API design for statistics.'],
    ['Open Data Standards and Licensing', 'OPEN_DATA', 'iGOT Karmayogi (sample)', 'demo', 'reading', 2, 'Apply open-data licensing correctly', 'https://igot.example.gov.in/open-data-licensing', 'Sample reading on publication standards.'],
    ['Case Study: Redesigning a Price Collection Survey', 'PRICE_STATS', 'Internal (sample)', 'demo', 'case_study', 2, 'Propose improvements to a price survey', 'https://statwise.demo/cs-price', 'Synthetic case study with decision points.'],
    ['Case Study: PLFS Nonresponse Follow-up', 'LABOUR_STATS', 'Internal (sample)', 'demo', 'case_study', 2, 'Design a follow-up strategy for nonresponse', 'https://statwise.demo/cs-plfs', 'Synthetic case study on field operations.'],
    ['Case Study: Validating ASI Micro-data', 'DATA_QUALITY', 'Internal (sample)', 'demo', 'case_study', 2, 'Apply validation rules to industrial returns', 'https://statwise.demo/cs-asi', 'Synthetic case study with rule sets.'],
    ['Case Study: GDP Nowcasting Review', 'NATIONAL_ACCOUNTS', 'Internal (sample)', 'demo', 'case_study', 2, 'Critique a nowcasting exercise', 'https://statwise.demo/cs-gdp', 'Synthetic case study on nowcasting practice.'],
    ['Case Study: SDG Disaggregation Dilemma', 'SDG_INDICATORS', 'Internal (sample)', 'demo', 'case_study', 2, 'Balance disaggregation and reliability', 'https://statwise.demo/cs-sdg', 'Synthetic case study on reporting standards.'],
    ['Case Study: Sampling for a New Price Survey', 'SAMPLING', 'Internal (sample)', 'demo', 'case_study', 2, 'Design a sampling plan under constraints', 'https://statwise.demo/cs-sampling', 'Synthetic case study with budget constraints.']
  ]
  const resIds = {}
  for (const [title, code, provider, sourceType, resourceType, duration, outcome, url, description] of resources) {
    resIds[title] = insertRes.run(title, compIds[code], provider, sourceType, resourceType, duration, outcome, url, description).lastInsertRowid
  }

  // Multi-part case-study content used by learner activities
  const insertAct = db.prepare(`INSERT INTO learning_activities
    (title, competency_id, activity_type, content, dataset_note) VALUES (?, ?, ?, ?, ?)`)
  insertAct.run(
    'Case Study: Sampling for a New Price Survey',
    compIds.SAMPLING, 'case_study',
    JSON.stringify({
      scenario: 'Your division must redesign the outlet sample for a monthly price survey in a mid-sized city. The previous sample aged badly: new outlets opened in peri-urban markets that were never selected, and index movements were questioned by analysts.',
      data: 'Synthetic outlet register: 1,240 outlets across 18 markets; 312 closed or relocated in the last year; outlet sizes range from single-vendor stalls to supermarkets.',
      questions: [
        'Which sampling frame updates would you make before selection, and why?',
        'Propose a stratification scheme. Which variables matter most for index accuracy?',
        'How would you measure and control the variance contribution of the peri-urban stratum?',
        'What would you monitor monthly to detect sample aging early?'
      ],
      guidance: 'Strong answers refresh the frame, stratify by market type and outlet size, use probability proportional to size for major markets, and set up monthly aging indicators (response rate by stratum, share of outlets older than 24 months).'
    }),
    'Synthetic outlet register (demo), 1,240 records'
  )
  insertAct.run(
    'Case Study: PLFS Nonresponse Follow-up',
    compIds.LABOUR_STATS, 'case_study',
    JSON.stringify({
      scenario: 'A rural block shows 18% household nonresponse in the PLFS rotation. Supervisors suspect listing errors and enumerator fatigue. You must design a follow-up strategy without breaching visit limits.',
      data: 'Synthetic block records: 96 sampled households, 17 nonresponding; paradata on visit times and outcomes.',
      questions: [
        'How would you classify nonresponse causes before acting?',
        'Which households get a follow-up visit under a two-visit limit?',
        'How would you test whether nonresponse is ignorable for unemployment estimates?',
        'What supervision change would reduce repeat nonresponse next rotation?'
      ],
      guidance: 'Look for classification by cause, risk-based re-approach lists, a modest nonresponse bias check against roster characteristics, and supervisory retraining or callback audits.'
    }),
    'Synthetic PLFS block paradata (demo)'
  )
  insertAct.run(
    'Exercise: Validating ASI Micro-records',
    compIds.DATA_QUALITY, 'exercise',
    JSON.stringify({
      scenario: 'A batch of 500 ASI returns arrives with suspicious values: negative value-added for 9 factories, output larger than turnover for 4, and employment of 0 for 14 units with positive output.',
      data: 'Synthetic ASI batch extract (demo): 500 rows, key variables only.',
      questions: [
        'Which rules would you run first, and which are hard failures vs. soft flags?',
        'How would you treat the negative value-added units: query, edit, or impute? Defend the choice.',
        'Design a summary report that tells the processing chief whether the batch is releasable.',
        'When would you escalate to a re-collection request?'
      ],
      guidance: 'Strong answers separate hard validations (turnover < output) from plausibility flags (negative value-added), document edit decisions, and release with notes when nonresponse is low and edits are traceable.'
    }),
    'Synthetic ASI batch extract (demo)'
  )

  // Assessment bank: seeded questions mapped to competencies
  const insertQ = db.prepare(`INSERT INTO questions
    (assessment_id, competency_id, question_type, prompt, options, correct_answer, explanation, source_ref, origin, grounding_status, difficulty)
    VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 'seeded', 'grounded', ?)`)
  const bank = [
    [compIds.SAMPLING, 'single', 'A city price survey samples 18 markets, then outlets within markets. This design is best described as:',
      JSON.stringify(['Simple random sampling', 'Two-stage cluster sampling', 'Systematic sampling', 'Quota sampling']), 'Two-stage cluster sampling',
      'Markets are primary sampling units and outlets are secondary units selected within them: a two-stage design.', 'Sampling theory; PRD framework topic: Sampling', 2],
    [compIds.SAMPLING, 'single', 'Stratification improves precision mainly because:',
      JSON.stringify(['It reduces the sample size needed', 'It removes all sampling bias', 'Units within strata are more homogeneous', 'It eliminates the need for weights']), 'Units within strata are more homogeneous',
      'Stratification gains precision when within-stratum variance is lower than overall variance.', 'Sampling theory; PRD framework topic: Sampling', 2],
    [compIds.SURVEY_DESIGN, 'single', 'Piloting a questionnaire primarily helps to:',
      JSON.stringify(['Reduce printing cost', 'Identify ambiguous wording and flow problems', 'Increase the response rate guarantee', 'Replace supervisor training']), 'Identify ambiguous wording and flow problems',
      'Pilots expose comprehension and routing problems before full-scale data collection.', 'Survey methodology; PRD framework topic: Survey Design', 1],
    [compIds.NATIONAL_ACCOUNTS, 'single', 'In the production approach, GDP is measured as:',
      JSON.stringify(['Sum of all sales revenues', 'Value of output minus intermediate consumption', 'Total wages paid', 'Final consumption plus exports']), 'Value of output minus intermediate consumption',
      'GVA equals output minus intermediate consumption; summing GVA across industries gives GDP (production approach).', 'SNA 2008 basics; PRD framework topic: National Accounts', 2],
    [compIds.PRICE_STATS, 'single', 'When an item leaves the CPI basket, the standard first response is:',
      JSON.stringify(['Drop the outlet from the sample', 'Splice in a comparable replacement item', 'Freeze the index', 'Rebase immediately']), 'Splice in a comparable replacement item',
      'Comparable replacement with a splice preserves continuity of the series.', 'Index-number practice; PRD framework topic: Price Statistics', 2],
    [compIds.LABOUR_STATS, 'single', 'In PLFS, the current weekly status approach records activity:',
      JSON.stringify(['Over the previous 365 days', 'During the 7 days preceding the survey', 'On the day of interview only', 'Over the previous month']), 'During the 7 days preceding the survey',
      'Current weekly status uses a 7-day reference period; principal status uses 365 days.', 'PLFS concepts; PRD framework topic: Labour Statistics', 2],
    [compIds.AGRI_STATS, 'single', 'Crop-cutting experiments estimate:',
      JSON.stringify(['Irrigated area', 'Average yield per hectare', 'Total cultivated area', 'Crop prices']), 'Average yield per hectare',
      'Crop-cutting surveys physically harvest sample plots to estimate yield.', 'Agricultural statistics methods; PRD framework topic: Agricultural Statistics', 1],
    [compIds.INDUSTRIAL_STATS, 'single', 'The ASI factory framework is primarily derived from:',
      JSON.stringify(['Household listings', 'Annual factory registrations', 'Village records', 'Telecom subscriber data']), 'Annual factory registrations',
      'The ASI frame comes from registered factories under the Factories Act.', 'ASI methodology; PRD framework topic: Industrial Statistics', 2],
    [compIds.SDG_INDICATORS, 'single', 'SDG indicator tier classification reflects:',
      JSON.stringify(['Political priority', 'Methodological development and data availability', 'Country income group', 'Budget allocation']), 'Methodological development and data availability',
      'Tiers indicate whether methodologies are established and data widely available.', 'UN SDG metadata; PRD framework topic: SDG Indicators', 2],
    [compIds.METADATA, 'single', 'GSBPM primarily provides:',
      JSON.stringify(['A legal framework for statistics', 'A model of the statistical production process', 'A database schema', 'A staffing policy']), 'A model of the statistical production process',
      'The Generic Statistical Business Process Model describes phases of statistical production.', 'UNECE GSBPM; PRD framework topic: Metadata Standards', 1],
    [compIds.DATA_QUALITY, 'single', 'Editing that changes values without documentation is problematic mainly because it:',
      JSON.stringify(['Costs too much', 'Reduces transparency and reproducibility', 'Slows computers', 'Violates sampling theory']), 'Reduces transparency and reproducibility',
      'Undocumented edits make outputs non-reproducible and undermine trust.', 'DQAF principles; PRD framework topic: Data Quality', 2],
    [compIds.PYTHON, 'single', 'pandas is most useful for:',
      JSON.stringify(['Designing questionnaires', 'Tabular data manipulation and analysis', 'Field interviewing', 'Cartography']), 'Tabular data manipulation and analysis',
      'pandas provides DataFrames for tabular manipulation, cleaning, and aggregation.', 'Python data stack; PRD framework topic: Python', 1],
    [compIds.R_LANG, 'single', 'In R, which function set supports reproducible literate analysis documents?',
      JSON.stringify(['rmarkdown / Quarto', 'base graphics only', 'svydesign', 'data.table indices']), 'rmarkdown / Quarto',
      'R Markdown and Quarto combine code, output, and narrative in one document.', 'R tooling; PRD framework topic: R', 1],
    [compIds.SQL, 'single', 'A LEFT JOIN returns:',
      JSON.stringify(['Only matching rows', 'All rows from the left table plus matches from the right', 'All rows from both tables', 'Only unmatched rows']), 'All rows from the left table plus matches from the right',
      'LEFT JOIN preserves all left-table rows, filling unmatched right columns with NULL.', 'SQL fundamentals; PRD framework topic: SQL', 1],
    [compIds.DATA_VIZ, 'single', 'For showing a monthly index series over 5 years, the clearest default chart is:',
      JSON.stringify(['Pie chart', 'Line chart', 'Stacked area of totals', 'Radar chart']), 'Line chart',
      'Line charts encode time series accurately and support trend reading.', 'Visualization practice; PRD framework topic: Data Visualization', 1],
    [compIds.AI_ML, 'single', 'A key governance concern when using ML in official statistics is:',
      JSON.stringify(['Model accuracy alone', 'Transparency and auditability of model-driven edits', 'Using the newest libraries', 'Cloud cost optimization']), 'Transparency and auditability of model-driven edits',
      'Official statistics require explainable, auditable processes; opaque model edits are a governance risk.', 'ML governance; PRD framework topic: AI/ML', 2],
    [compIds.STATA, 'single', 'In Stata, svyset is used to:',
      JSON.stringify(['Declare survey design variables for correct variance estimation', 'Sort datasets', 'Merge two datasets', 'Export to Excel']), 'Declare survey design variables for correct variance estimation',
      'svyset declares PSU, strata, and weights so survey procedures estimate variance correctly.', 'Stata survey tools; PRD framework topic: Stata', 2],
    [compIds.SPSS, 'single', 'SPSS is most commonly used for:',
      JSON.stringify(['Statistical packages for social-survey processing', 'Writing operating systems', 'Designing logos', 'Compiling national accounts']), 'Statistical packages for social-survey processing',
      'SPSS is widely used for social-survey data processing and descriptive analysis.', 'SPSS usage; PRD framework topic: SPSS', 1],
    [compIds.SAS, 'single', 'In SAS, the DATA step is primarily used to:',
      JSON.stringify(['Read, transform, and write datasets', 'Render web pages', 'Design surveys', 'Train neural networks natively']), 'Read, transform, and write datasets',
      'The DATA step reads, transforms, and outputs SAS datasets.', 'SAS fundamentals; PRD framework topic: SAS', 1],
    [compIds.GIS, 'single', 'An enumeration block map in a census workflow is used to:',
      JSON.stringify(['Assign workloads to enumerators geographically', 'Estimate crop yields', 'Compute CPI weights', 'Store metadata'], ), 'Assign workloads to enumerators geographically',
      'Enumeration-area maps assign geographic workloads and prevent coverage gaps.', 'Census geography; PRD framework topic: GIS', 1],
    [compIds.CLOUD, 'single', 'When hosting official statistics in the cloud, the first governance question is:',
      JSON.stringify(['Which provider is cheapest', 'Data residency and security compliance', 'Number of CPUs', 'UI framework']), 'Data residency and security compliance',
      'Government data governance starts with residency, security, and compliance requirements.', 'Cloud governance; PRD framework topic: Cloud Computing', 2],
    [compIds.APIS, 'single', 'A statistical agency publishing data via API most directly supports:',
      JSON.stringify(['Machine-readable reuse by downstream users', 'Print publication', 'Manual emails', 'In-person training']), 'Machine-readable reuse by downstream users',
      'APIs expose structured data for programmatic reuse.', 'Open-data practice; PRD framework topic: APIs', 1],
    [compIds.OPEN_DATA, 'single', 'Open-data publication standards primarily require:',
      JSON.stringify(['Machine-readable formats with clear licences', 'Password-protected archives', 'Printed reports only', 'Proprietary formats']), 'Machine-readable formats with clear licences',
      'Open data means machine-readable, reusable formats under open licences.', 'Open-data standards; PRD framework topic: Open Data', 1]
  ]
  for (const q of bank) insertQ.run(...q)

  // A published, grounded sample quiz (fallback-mode, clearly labelled)
  const quizId = db.prepare(`INSERT INTO quizzes (title, topic, competency_id, created_by, source_doc_name, source_excerpt, generation_mode, status)
    VALUES (?, ?, ?, ?, ?, ?, 'fallback', 'published')`).run(
    'Sampling Fundamentals Check',
    'Sampling',
    compIds.SAMPLING,
    ids['Vikram Rao'],
    'sample-sampling-notes.pdf (demo)',
    'Two-stage designs select primary units (markets) then secondary units (outlets). Stratification exploits homogeneous subgroups to improve precision.'
  ).lastInsertRowid
  const samplingQs = db.prepare('SELECT id FROM questions WHERE competency_id = ? AND origin = ?').all(compIds.SAMPLING, 'seeded')
  const insertQQ = db.prepare('INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES (?, ?, ?)')
  samplingQs.forEach((q, i) => insertQQ.run(quizId, q.id, i))

  // Integration status (honest labels)
  const insertInt = db.prepare('INSERT INTO integration_status (key, label, status, detail) VALUES (?, ?, ?, ?)')
  insertInt.run('igot', 'iGOT Karmayogi', 'demo_data', 'Sample resource records only. Live catalogue integration requires authorized API access and credentials (IGOT_API_BASE_URL, IGOT_API_KEY).')
  insertInt.run('nssta', 'NSSTA / TPAC Programmes', 'demo_data', 'Synthetic sample programme listings. Live integration requires NSSTA API details and authorization.')
  insertInt.run('mission_karmayogi', 'Mission Karmayogi (FRU registration)', 'requires_authorization', 'No government SSO is implemented. Demo sign-in only; FRU-based authentication needs official authorization.')
  insertInt.run('ai_provider', 'AI Provider (quiz generation & assistant)', process.env.AI_API_KEY ? 'live' : 'not_configured', process.env.AI_API_KEY ? 'Configured AI provider in use.' : 'No AI_API_KEY configured. Quiz generation and the assistant use a clearly labelled rules-based fallback. Set AI_PROVIDER, AI_API_KEY, AI_MODEL to enable live AI.')
  insertInt.run('database', 'Persistence', 'live', 'SQLite file database (data/statwise.db) via Node built-in node:sqlite. Fully persistent for this demo.')

  console.log('[seed] Database seeded with demo data.')
}

module.exports = { seedIfEmpty }
