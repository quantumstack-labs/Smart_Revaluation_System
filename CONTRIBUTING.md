# Contributing to ReValuate

First off, thanks for taking the time to contribute!

ReValuate is an AI-powered Exam Revaluation System that helps students get fair, transparent grading using Gemini Vision AI. We welcome contributions from the community.

---
##  Deployment Note for Contributors

**Why is the Live Demo incomplete?**
The codebase includes a fully functional Redis + BullMQ background worker system for AI processing. However, we have **intentionally not deployed the Worker Service** to the live production environment to avoid monthly cloud infrastructure costs.
![Payment Proof For Worker](/images_of_website/Payment_proof.png)

###  How to Test AI Features (Local Development)
Since the worker is offline in production, you **must run the project locally** to see the AI grading in action.

1.  **Start Redis** (Ensure your Upstash or local Redis is running).
2.  **Start the Worker:**
    ```bash
    cd backend
    npm run worker
    ```
3.  **Start the API & Frontend:**
    ```bash
    npm run dev
    ```
 

##  Current Subjects
The system currently supports the following standard subjects. If adding a new one, ensure you update the Database ENUMs and Frontend Selectors.

*   **UX** - User Experience Design
*   **AIML** - AI & Machine Learning
*   **PMA** - Project Management & Analysis
*   **COA** - Computer Organization & Architecture
*   **EHS** - Environmental Health & Safety

## Prerequisites
Ensure you have the exact versions to avoid conflicts:
*   **Node.js**: v20.x (LTS)
*   **Redis**: v7.x (or Upstash Serverless)
*   **PostgreSQL**: v14+ (via Supabase)

## Good First Issues
New to the project? Try these:
1.  **Validation**: Add regex validation for "Student Register Number" (Must be alphanumeric, e.g., `REG2023`).
2.  **UI Polish**: Improve the "Loading Skeleton" for the Dashboard charts.
3.  **Logs**: Add clearer console logs in `authMiddleware.js` for failed token attempts.

##  Tech Stack & Architecture

* **AI:** Google Gemini 1.5 Flash (Vision & Text)
* **Payment:** Stripe Integration
* **File Storage:** Supabase Storage

**Architecture Type:** Hybrid Monolith + Microservice Workers

---

##  Quick Start (Local Development)

### Prerequisites

Make sure you have these installed:
- **Node.js** v20+ ([Download](https://nodejs.org/))
- **npm** v8+ (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Redis** (Local or Docker) **OR** Upstash account (recommended)
- **Supabase Account** ([Sign up](https://supabase.com))
- **Google AI API Key** ([Get key](https://ai.google.dev/))

---

### Step 1: Fork and Clone

```bash
# Fork the repository on GitHub (click "Fork" button)

# Clone YOUR fork
git clone https://github.com/YOUR-USERNAME/revaluate.git
cd revaluate

# Add upstream remote (to sync with main repo)
git remote add upstream https://github.com/ORIGINAL-USERNAME/revaluate.git
```

---

### Step 2: Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
```

#### Edit `backend/.env` with your credentials:

```bash
# Database (Supabase)
# IMPORTANT: Create your OWN free Supabase project. Do NOT use production credentials.
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_ID].supabase.co:5432/postgres
SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
SUPABASE_KEY=[YOUR_ANON_KEY]

# Redis (Upstash)
REDIS_URL=rediss://default:[PASSWORD]@[HOST].upstash.io:6379

# AI (Google Gemini)
GEMINI_API_KEY=AIza[YOUR_KEY]

# JWT
JWT_SECRET=[GENERATE_RANDOM_64_CHAR_STRING]

# Payment (Test Mode)
STRIPE_SECRET_KEY=[YOUR_KEY]


# Server
PORT=port_number
NODE_ENV=development
```

**How to get credentials:**
- **Supabase**: Create project → Settings → API → Copy URL & Anon Key
- **Upstash**: Create Redis database → Copy REST URL
- **Gemini**: Visit [Google AI Studio](https://ai.google.dev/) → Get API Key
- **Stripe**: Sign up → Settings → API Keys (use test mode)
---

### Step 3: Frontend Setup

```bash
cd ../frontend
npm install

# Create .env file
cp .env.example .env
```

#### Edit `frontend/.env`:

```bash
VITE_API_URL=http://localhost:5000/
VITE_STRIPE_PUBLIC_KEY=[YOUR_KEY]
VITE_SUPABASE_URL=https://[PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
```

---

### Step 4: Run Services

**You need THREE terminals running simultaneously:**

#### Terminal 1: Backend API Server
```bash
cd backend
npm run dev


#### Terminal 2: Background Workers
```bash
cd backend
npm run worker


#### Terminal 3: Frontend Dev Server
```bash
cd frontend
npm run dev

---

### Step 6: Verify Installation

1. **Frontend**: Open `http://localhost:5173` → You should see the landing page
2. **Backend API**: Visit `http://localhost:5000/api/health` → Should return `{"status":"ok"}`
3. **Create Test Account**: 
   - Sign up as Student
   - Sign up as Teacher (use different email)

---

## 🧪 How to Test Your Changes

### Test Scenario 1: Student Upload Flow

```bash
1. Login as Student
2. Go to Dashboard → Apply for Revaluation
3. Complete payment (use test card: 1111 1111 1111 1111)
4. Upload answer script (PDF or images)
```

### Test Scenario 2: AI Grading Flow

```bash
1. Login as Teacher
2. Upload Answer Key (Answer Keys tab)
3. Go to pending requests
4. Click Purple (Grade) button
5. Check Worker terminal for AI processing logs
6. Verify AI feedback appears in grading workspace
```

### Test Scenario 3: Background Worker

```bash
# In Worker terminal, you should see:
[INFO] Job received: embedding-queue
[INFO] Processing answer key: CS101
[INFO] Text extracted: 1234 characters
[INFO] Job completed successfully
```

---

##  Reporting Bugs

Found a bug? Please help us fix it!

### Before Submitting:
- Check [existing issues](https://github.com/quantumstack-labs/Smart_Revaluation_System/issues)
- Verify it's reproducible in latest version
- Collect error logs (backend terminal + browser console)

### Bug Report Template:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots/Logs**
Paste error logs or screenshots.

**Environment:**
- OS: [e.g. Windows 11, macOS 14]
- Node.js version: [run `node --version`]
- Browser: [e.g. Chrome 120]

**Additional context**
Any other relevant information.
```

---

## Suggesting Features

We love new ideas! Before suggesting:
1. Check [existing feature requests](https://github.com/quantumstack-labs/Smart_Revaluation_System/issues)
2. Ensure it aligns with project goals (fair, transparent revaluation)

### Feature Request Template:

```markdown

**Describe the solution**
Clear description of what you want to happen.

**Describe alternatives**
Any alternative solutions you've considered.

**Additional context**
Mockups, diagrams, or examples.
```

---

##  Development Guidelines

### Code Style

- **JavaScript**: Use ES6+ syntax, async/await over callbacks
- **React**: Functional components with hooks (no class components)
- **Naming**: 
  - Variables: `camelCase` (e.g., `studentId`)
  - Components: `PascalCase` (e.g., `StudentDashboard`)
  - Constants: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`)

### File Organization

```
backend/
  ├── controllers/    # Request handlers (business logic)
  ├── routes/         # Express route definitions
  ├── middleware/     # Auth, validation, error handling
  ├── workers/        # Background job processors
  └── utils/          # Helper functions

frontend/
  ├── src/
      ├── components/  # Reusable UI components
      ├── pages/       # Full page components
      ├── context/     # React context providers
      └── utils/       # Helper functions
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add email notification for published results
fix: resolve AI quota exceeded error
docs: update API reference with new endpoints
style: format code with prettier
refactor: extract grading logic into separate service
test: add unit tests for payment verification
chore: update dependencies
```

### Branch Naming

```bash
feature/email-notifications
fix/ai-quota-error
docs/update-readme
refactor/grading-service
```

---

##  Pull Request Process

### 1. Create a Feature Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clean, documented code
- Add comments for complex logic
- Update relevant documentation
- Test thoroughly (manual + automated if applicable)

### 3. Commit and Push

```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

### 4. Open Pull Request

- Go to your fork on GitHub
- Click "Compare & Pull Request"
- Fill in the PR template:

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How did you test this?
- [ ] Local development
- [ ] Manual testing
- [ ] Automated tests added

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed the code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings/errors
- [ ] Added tests (if applicable)

## Screenshots (if UI changes)
Attach before/after screenshots.
```

### 5. Code Review

- Address reviewer feedback promptly
- Make requested changes in new commits
- Don't force-push after review starts

### 6. Merge

- Requires **2 approvals** from maintainers
- Squash commits before merging (maintainers will do this)

---

##  Areas Open for Contribution



###  Intermediate Contributions

1. **Email Notification System**
   - Send email when request is published
   - Send reminder if teacher hasn't reviewed in 3 days
   - Weekly digest for pending requests
   - **Tech**: Nodemailer, SendGrid, or Resend

2. **Real-Time Updates**
   - WebSocket integration for live status updates
   - Notify teacher when new request arrives
   - Student sees "Processing..." animation in real-time
   - **Tech**: Socket.io or Supabase Realtime

3. **Analytics Dashboard (Admin)**
   - Teacher performance metrics (avg. review time)
   - Subject-wise revaluation statistics
   - AI accuracy tracking (compare AI vs manual scores)
   - **Tech**: Chart.js, Recharts

4. **Batch Upload**
   - Allow teachers to upload multiple answer keys at once
   - Bulk approve multiple requests
   - Export results as CSV/Excel
   - **Tech**: Multer (multi-file), ExcelJS

5. **Search & Filter**
   - Search requests by student name/reg no
   - Filter by date range, subject, status
   - Sort by oldest, newest, score
   - **Tech**: Frontend state + API endpoints

---

###  Advanced Contributions

1. **Semantic Search for Answer Keys**
   - Use embeddings to find similar past gradings
   - Suggest grading based on historical data
   - Auto-detect plagiarism in answers
   - **Tech**: Google Text Embeddings, Vector DB (Pinecone/Qdrant)

2. **Multi-Language Support (i18n)**
   - Translate UI to Hindi, Tamil, etc.
   - Support regional language answer scripts
   - AI grading for non-English answers
   - **Tech**: i18next, Google Translate API

3. **Docker Deployment**
   - Create Dockerfile for backend + workers
   - Docker Compose for entire stack
   - Kubernetes deployment manifests
   - **Tech**: Docker, K8s

4. **AI Model Fine-Tuning**
   - Train custom model on grading rubrics
   - Improve accuracy for handwriting recognition
   - Subject-specific grading models
   - **Tech**: TensorFlow, PyTorch, Gemini Fine-tuning

5. **Mobile App**
   - React Native app for students
   - Push notifications for results
   - Offline mode for viewing past reports
   - **Tech**: React Native, Expo

6. **Advanced Security**
   - Rate limiting per user (prevent abuse)
   - Two-factor authentication (2FA)
   - Audit logging for all actions
   - IP whitelisting for admin panel
   - **Tech**: express-rate-limit, speakeasy (2FA)

7. **Performance Optimization**
   - Implement Redis caching for frequent queries
   - CDN for answer script images
   - Database query optimization
   - Frontend code splitting & lazy loading
   - **Tech**: Redis, Cloudflare, React.lazy()

---

##  Design Contributions

We welcome designers too!

- **UI/UX Improvements**: Figma mockups for new features
- **Icons & Illustrations**: Custom SVG icons
- **Branding**: Logo redesign, color palette suggestions
- **Accessibility**: WCAG compliance audits

---

## Documentation Contributions

Help improve our docs:

- **Tutorials**: Step-by-step guides for common tasks
- **API Examples**: More request/response examples
- **Troubleshooting**: Add solutions for errors you encountered
- **Architecture Diagrams**: Create visual explanations
- **Video Walkthroughs**: Record screen demos

---

##  Community Guidelines

- Be respectful and inclusive
- Help newcomers get started
- Provide constructive feedback
- Follow our [Code of Conduct](CODE_OF_CONDUCT.md)

---


##  Thank You!

Every contribution, no matter how small, makes a difference. Thank you for helping make education more fair and transparent! 

---

**Happy Coding! **
