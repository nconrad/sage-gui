import { test, expect, type Cookie } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const ROUTE = `${BASE_URL}/request-access`

const AUTH_URL = 'https://auth.sagecontinuum.org'

const cookieConfig = {
  domain: 'localhost',
  path: '/',
  secure: false,
  sameSite: 'Lax' as Cookie['sameSite'],
}

const mockProjects = [
  { id: 1, name: 'Test Project Alpha', member_count: 3,
    nodes: [{vsn: 'W001'}, {vsn: 'W002'}] },
  { id: 2, name: 'Test Project Beta', member_count: 1, nodes: [{vsn: 'W003'}]},
]

const mockNodes = [
  { vsn: 'W001', node: 'node-001', site_id: 'site-1', city: 'Chicago', state: 'IL' },
  { vsn: 'W002', node: 'node-002', site_id: 'site-2', city: 'Argonne', state: 'IL' },
  { vsn: 'W003', node: 'node-003', site_id: 'site-3', city: 'Boulder', state: 'CO' },
]

const mockUser = {
  login: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  organization: 'Test University',
}


async function setupMocks(page) {
  // Mock projects API
  await page.route(`${AUTH_URL}/projects/**`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockProjects) })
  )

  // Mock node-metas / nodes APIs (beekeeper)
  await page.route('**/node-metas/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockNodes) })
  )

  // Mock getUserDetails: GET /users/<username>
  await page.route(`${AUTH_URL}/users/**`, route =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        login: 'testuser', name: mockUser.name, email: mockUser.email,
        is_staff: false, is_approved: true, is_superuser: false,
      })
    })
  )

  // Mock getUserProfile: GET /user_profile/<username>
  await page.route(`${AUTH_URL}/user_profile/**`, route =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ organization: mockUser.organization, department: '', bio: '' })
    })
  )

  // Mock send-request endpoint
  await page.route(`${AUTH_URL}/send-request/**`, route =>
    route.fulfill({ status: 200, body: '' })
  )
}


test.describe('Request Access form', () => {

  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      { name: 'sage_username', value: 'testuser', ...cookieConfig },
      { name: 'sage_token', value: 'fake-token', ...cookieConfig },
    ])
    await setupMocks(page)
  })


  test('renders form title', async ({ page }) => {
    await page.goto(ROUTE)
    await expect(page.getByRole('heading', { name: 'Sage Access Request' }))
      .toBeVisible()
  })


  test('shows request type options', async ({ page }) => {
    await page.goto(ROUTE)
    await expect(page.getByLabel('Request access to specific nodes or projects')).toBeVisible()
    await expect(page.getByLabel('Request access to protected data sets')).toBeVisible()
  })


  test('step 2 is hidden until a request type is selected', async ({ page }) => {
    await page.goto(ROUTE)
    await expect(page.getByLabel('Nodes (multiple allowed)')).not.toBeVisible()
    await page.getByLabel('Request access to specific nodes or projects').click()
    await expect(page.getByLabel('Nodes (multiple allowed)')).toBeVisible()
  })


  test('step 3 project info is hidden until a request type is selected', async ({ page }) => {
    await page.goto(ROUTE)
    await expect(page.getByLabel('PI Name')).not.toBeVisible()
    await page.getByLabel('Request access to specific nodes or projects').click()
    await expect(page.getByLabel('PI Name')).toBeVisible()
  })


  test('submit button is disabled when required fields are empty', async ({ page }) => {
    await page.goto(ROUTE)
    await page.getByLabel('Request access to specific nodes or projects').click()
    await expect(page.getByRole('button', { name: 'Submit!' })).toBeDisabled()
  })


  test('submit button enables after required fields are filled', async ({ page }) => {
    await page.goto(ROUTE)

    await page.getByLabel('Request access to specific nodes or projects').click()

    await page.getByLabel('PI Name').fill('Jane Smith')
    await page.getByLabel('PI Email').fill('jane@example.com')
    await page.getByLabel('Project Title').fill('My Test Project')

    // select related_to_proposal = no
    await page.locator('input[name="related_to_proposal"][value="no"]').click()

    // fill new required project detail fields
    await page.locator('textarea[name="edge_code_description"]').fill('Motion detection algorithms')
    await page.locator('textarea[name="publication_plan"]').fill('Open-access journal publication')
    await page.locator('textarea[name="data_collection"]').fill('Aggregated sensor scores only')
    await page.locator('input[name="is_non_commercial"]').check()
    await page.locator('input[name="running_apps"]').check()
    const scienceInput1 = page.getByLabel('Science field; select all that apply')
    await scienceInput1.click()
    await page.getByRole('option', { name: 'Computer Science', exact: true }).click()
    await page.keyboard.press('Escape')

    await expect(page.getByRole('button', { name: 'Submit!' })).toBeEnabled()
  })


  test('submission summary appears after submit', async ({ page }) => {
    await page.goto(ROUTE)

    await page.getByLabel('Request access to specific nodes or projects').click()

    await page.getByLabel('PI Name').fill('Jane Smith')
    await page.getByLabel('PI Email').fill('jane@example.com')
    await page.getByLabel('PI Institution').fill('Test University')
    await page.getByLabel('Project Title').fill('My Test Project')
    await page.getByLabel('Project Name').fill('MTP')
    await page.locator('input[name="related_to_proposal"][value="no"]').click()

    await page.locator('textarea[name="edge_code_description"]').fill('Motion detection at the edge')
    await page.locator('textarea[name="publication_plan"]').fill('Open-access journal publication')
    await page.locator('textarea[name="data_collection"]').fill('Aggregated scores, no PII')
    await page.locator('input[name="is_non_commercial"]').check()
    await page.locator('input[name="running_apps"]').check()
    const scienceInput2 = page.getByLabel('Science field; select all that apply')
    await scienceInput2.click()
    await page.getByRole('option', { name: 'Computer Science', exact: true }).click()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Submit!' }).click()

    const summary = page.locator('pre')
    await expect(summary).toBeVisible()
    await expect(summary).toContainText('Submission Summary')
    await expect(summary).toContainText('Jane Smith')
    await expect(summary).toContainText('jane@example.com')
    await expect(summary).toContainText('My Test Project')
    await expect(summary).toContainText('MTP')
    await expect(summary).toContainText('Edge Code Description')
    await expect(summary).toContainText('Publication Plan')
    await expect(summary).toContainText('Data to be Collected')
    await expect(summary).toContainText('Non-Commercial Confirmation')
  })


  test('PI info populates when "I\'m the PI" toggle is switched on', async ({ page }) => {
    await page.goto(ROUTE)
    await page.getByLabel('Request access to specific nodes or projects').click()

    await page.getByLabel('I\'m also the Principal Investigator (PI)').click()

    await expect(page.getByLabel('PI Name')).toHaveValue(mockUser.name)
    await expect(page.getByLabel('PI Email')).toHaveValue(mockUser.email)
    await expect(page.getByLabel('PI Institution')).toHaveValue(mockUser.organization)
  })


  test('proposal fields appear when "related to proposal" is yes', async ({ page }) => {
    await page.goto(ROUTE)
    await page.getByLabel('Request access to specific nodes or projects').click()

    await expect(page.getByLabel('Proposal Title')).not.toBeVisible()
    await page.getByLabel('Yes').first().click()  // related_to_proposal = yes
    await expect(page.getByLabel('Proposal Title')).toBeVisible()
  })


  test('can add and remove funding sources', async ({ page }) => {
    await page.goto(ROUTE)
    await page.getByLabel('Request access to specific nodes or projects').click()

    // one row by default
    await expect(page.getByLabel('Grant Number or ID')).toHaveCount(1)

    await page.getByRole('button', { name: 'Add Another Funding Source' }).click()
    await expect(page.getByLabel('Grant Number or ID')).toHaveCount(2)

    await page.getByRole('button', { name: 'Remove' }).first().click()
    await expect(page.getByLabel('Grant Number or ID')).toHaveCount(1)
  })


  test('science field autocomplete has options', async ({ page }) => {
    await page.goto(ROUTE)
    await page.getByLabel('Request access to specific nodes or projects').click()

    const scienceInput = page.getByLabel('Science field; select all that apply')
    await scienceInput.click()

    await expect(page.getByRole('option', { name: 'Physics', exact: true })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Soil Science', exact: true })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Computer Science', exact: true })).toBeVisible()
  })


  test('HPC interest radio options are present and selectable', async ({ page }) => {
    await page.goto(ROUTE)
    await page.getByLabel('Request access to specific nodes or projects').click()

    await page.locator('input[name="hpc_interest"][value="maybe"]').click()

    // verify value is captured in summary
    await page.getByLabel('PI Name').fill('Jane Smith')
    await page.getByLabel('PI Email').fill('jane@example.com')
    await page.getByLabel('Project Title').fill('My Test Project')
    await page.locator('input[name="related_to_proposal"][value="no"]').click()
    await page.locator('textarea[name="edge_code_description"]').fill('Motion detection')
    await page.locator('textarea[name="publication_plan"]').fill('Open-access')
    await page.locator('textarea[name="data_collection"]').fill('Sensor aggregates')
    await page.locator('input[name="is_non_commercial"]').check()
    await page.locator('input[name="running_apps"]').check()
    const scienceInput3 = page.getByLabel('Science field; select all that apply')
    await scienceInput3.click()
    await page.getByRole('option', { name: 'Computer Science', exact: true }).click()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Submit!' }).click()
    await expect(page.locator('pre')).toContainText('maybe')
  })


  test('project detail fields are present and captured in summary', async ({ page }) => {
    await page.goto(ROUTE)
    await page.getByLabel('Request access to specific nodes or projects').click()

    await page.getByLabel('PI Name').fill('Jane Smith')
    await page.getByLabel('PI Email').fill('jane@example.com')
    await page.getByLabel('Project Title').fill('My Test Project')
    await page.locator('input[name="related_to_proposal"][value="no"]').click()

    // fill in the new project detail fields
    await page.locator('textarea[name="edge_code_description"]').fill('We detect motion using ML models')
    await page.locator('textarea[name="publication_plan"]').fill('Results will be published in open-access journals')
    await page.locator('textarea[name="data_collection"]').fill('Aggregated sensor scores only, no PII')
    await page.locator('input[name="is_non_commercial"]').check()
    await page.locator('input[name="running_apps"]').check()
    const scienceInput4 = page.getByLabel('Science field; select all that apply')
    await scienceInput4.click()
    await page.getByRole('option', { name: 'Computer Science', exact: true }).click()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Submit!' }).click()

    const summary = page.locator('pre')
    await expect(summary).toContainText('We detect motion using ML models')
    await expect(summary).toContainText('Results will be published in open-access journals')
    await expect(summary).toContainText('Aggregated sensor scores only, no PII')
    await expect(summary).toContainText('Confirmed')
  })


  test.describe('file_access (protected data sets) type', () => {

    test.beforeEach(async ({ page }) => {
      await page.goto(ROUTE)
      await page.getByLabel('Request access to protected data sets').click()
    })

    test('hides Running Apps and Shell Access permissions', async ({ page }) => {
      await expect(page.locator('input[name="running_apps"]')).not.toBeVisible()
      await expect(page.locator('input[name="shell_access"]')).not.toBeVisible()
      await expect(page.locator('input[name="file_access"]')).toBeVisible()
    })

    test('auto-checks file_access permission', async ({ page }) => {
      await expect(page.locator('input[name="file_access"]')).toBeChecked()
    })

    test('hides Project Title field', async ({ page }) => {
      await expect(page.getByLabel('Project Title')).not.toBeVisible()
    })

    test('hides edge code and publication plan fields', async ({ page }) => {
      await expect(page.locator('textarea[name="edge_code_description"]')).not.toBeVisible()
      await expect(page.locator('textarea[name="publication_plan"]')).not.toBeVisible()
    })

    test('submit enables without project title or edge code fields', async ({ page }) => {
      await page.getByLabel('PI Name').fill('Jane Smith')
      await page.getByLabel('PI Email').fill('jane@example.com')
      await page.locator('input[name="related_to_proposal"][value="no"]').click()
      await page.locator('textarea[name="data_collection"]').fill('Protected sensor data')
      await page.locator('input[name="is_non_commercial"]').check()

      const scienceInput = page.getByLabel('Science field; select all that apply')
      await scienceInput.click()
      await page.getByRole('option', { name: 'Computer Science', exact: true }).click()
      await page.keyboard.press('Escape')

      await expect(page.getByRole('button', { name: 'Submit!' })).toBeEnabled()
    })

    test('submit shows summary with file_access permission', async ({ page }) => {
      await page.getByLabel('PI Name').fill('Jane Smith')
      await page.getByLabel('PI Email').fill('jane@example.com')
      await page.locator('input[name="related_to_proposal"][value="no"]').click()
      await page.locator('textarea[name="data_collection"]').fill('Protected sensor data')
      await page.locator('input[name="is_non_commercial"]').check()

      const scienceInput = page.getByLabel('Science field; select all that apply')
      await scienceInput.click()
      await page.getByRole('option', { name: 'Computer Science', exact: true }).click()
      await page.keyboard.press('Escape')

      await page.getByRole('button', { name: 'Submit!' }).click()

      const summary = page.locator('pre')
      await expect(summary).toBeVisible()
      await expect(summary).toContainText('Submission Summary')
      await expect(summary).toContainText('**File Access:** Yes')
      await expect(summary).toContainText('Protected sensor data')
    })

  })

})
