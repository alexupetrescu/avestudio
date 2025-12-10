# GitHub Repository Setup Instructions

## Option 1: Create Repository via GitHub Website

1. Go to https://github.com/new (should be open in your browser)
2. Repository name: `avestudio`
3. Choose Public or Private
4. **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

After creating the repository, run these commands:

```bash
git remote add origin https://github.com/YOUR_USERNAME/avestudio.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Option 2: If you prefer to use GitHub CLI

Complete the authentication in the browser when prompted, then run:

```bash
gh repo create avestudio --public --source=. --remote=origin --push
```

