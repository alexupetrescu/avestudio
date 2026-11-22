# GitHub releases and production deployment

Edit locally, commit/push, let GitHub build/test, then explicitly deploy the
chosen commit. A Git push never activates production by itself. Each repository
has its own workflow and backend/frontend images. PostgreSQL, mail and shared
media live outside those images.

## Local development

Keep using the existing development servers and virtual environments. After
pulling these frontend dependency updates, refresh the Node installation in
each project's `frontend` folder with `npm ci`; AveStudio uses
`npm ci --legacy-peer-deps` for its existing React/Three peer requirements.
Restart the local frontend dev server afterward.

For a new JavaScript dependency, commit both `package.json` and
`package-lock.json`. Production Python dependencies come from
`ops/requirements.lock`, which contains hashes for Linux/Python 3.12 wheels.
A Python dependency change needs that lock updated and tested in Linux;
installing a package in a Windows virtual environment alone does not change
the production image. Keep dependency upgrades as a reviewed change.

## One-time setup on the development PC

Install GitHub CLI from PowerShell:

```powershell
winget install --id GitHub.cli --exact --source winget
```

Open a new PowerShell terminal so `gh` is on PATH. Sign in as
`alexupetrescu` in the browser window:

```powershell
gh auth login --hostname github.com --git-protocol https --web --scopes workflow
gh auth setup-git
gh auth status
gh api user --jq .login
```

The CLI needs `workflow` to push workflow files. CI publishes with its
temporary `GITHUB_TOKEN`; the VPS pulls public images without a package token.
Stripe, Drive, mailbox passwords and VPS SSH/sudo credentials are not GitHub
Actions secrets and are not build inputs.

Frontend static generation reads the sites' already-public HTTPS APIs, as a
browser would, so built pages contain published content. It uses no login,
private album PIN, payment key or Drive credential. If a public API required
for static generation is down, the build can fail while the current release
keeps running. Application and frontend integration tests use disposable data
and an isolated database instead of the production database.

## Initial setup (already completed on this PC)

The initial setup and its fixes have already been committed and pushed in
all three repositories. Use the deployment and everyday-update sections
below. The `publish_setup.py` bootstrap instructions in this section are
retained for reference; do not rerun that initial inventory after normal edits.

Run in each local project directory. For example:

```powershell
Set-Location D:\Web\avestudio
python .\ops\publish_setup.py
```

Repeat from `D:\Web\aveletter` and `D:\Web\lunador`. This helper verifies the
reviewed file hashes, commits only the setup inventory, pushes the separate
`ops/github-releases-20261114` branch and opens a pull request. It does not
stage unrelated work, reset files, publish the backup directory, or deploy.
The setup commit is on local `main`; the remote PR branch points to that same
commit. The merge-commit step below preserves a simple fast-forward afterward.

Watch each PR's tests from its project folder:

```powershell
gh pr checks ops/github-releases-20261114 --watch
gh pr view ops/github-releases-20261114 --web
```

After the checks pass and you review the PR, merge using **Create a merge
commit**, equivalent to this command. Use this merge method for the initial
setup so the local setup commit remains in the remote history:

```powershell
gh pr merge ops/github-releases-20261114 --merge --delete-branch
git pull --ff-only origin main
```

Repeat in all three folders. The merge into `main` triggers a new **Release
images** run, which publishes the images after all tests pass. Watch it:

```powershell
gh run list --workflow release.yml --branch main --limit 5
gh run watch
```

Select the new run for the commit you intend to release. A PR run builds and
tests but does not publish images. If GitHub asks to enable Actions, enable
the repository's Actions workflows. No automatic production deployment is
configured.

## Install the VPS deployment helper once, for all three projects

The application images are public, as approved for these public source
repositories. No personal access token or registry login is needed on the
VPS. This command opens SSH and prompts only for your VPS sudo password:

```powershell
Set-Location D:\Web\avestudio
python .\ops\deploy.py setup
```

This installs the shared root-owned deployment helper and creates an empty
Docker configuration for anonymous image pulls. It does not activate a release
or restart the sites. It is needed once per VPS, not once per project.

The GHCR packages are named `<project>-production-backend` and
`<project>-production-frontend` under `alexupetrescu`. Before application
builds, the workflow publishes a tiny marker image containing no source or
credentials and verifies public visibility and anonymous manifest access.
It repeats the checks after publishing and requires the anonymous manifest
hash to equal the registry's published digest. Release manifests explicitly
record `image_visibility: public`. The original `<project>-backend`
packages are unused; deployment rejects their image references.

Each project's `ops/project.json` explicitly approves public images. The
workflow also verifies that the source repository remains public. Changing
the repository to private stops publication; review image visibility before
publishing private source. Runtime `.env` files, Stripe/Drive credentials,
database backups, customer media and mailbox contents are excluded from
build contexts. Public source/dependencies and published website content
are included. Re-run `setup` once when updating the shared deployment helper.

## First production release

Start with one site. In that project's folder, synchronize main and select
the exact commit whose **main-branch** release build succeeded:

```powershell
git pull --ff-only origin main
$releaseCommit = git rev-parse HEAD
python .\ops\deploy.py plan --commit $releaseCommit
```

The plan downloads the digest-pinned images, checks their source/revision,
validates the existing production adapter and runs Django checks/migration
planning. Existing production containers keep running. It does not migrate
the database or enable another worker.

For a release with no pending schema migrations:

```powershell
python .\ops\deploy.py deploy --commit $releaseCommit
```

The initial Aveletter setup includes two explicit migrations for previously
unrecorded help-text changes and an index name. Review that plan, then use:

```powershell
Set-Location D:\Web\aveletter
$releaseCommit = git rev-parse HEAD
python .\ops\deploy.py plan --commit $releaseCommit
python .\ops\deploy.py deploy --commit $releaseCommit --migrate
```

`--migrate` explicitly permits the reviewed migration plan. The helper requires
a successful off-host production backup from the last 26 hours, takes an
additional immediate database dump, puts that site's hostnames in maintenance,
stops its writers, migrates with the new image and starts/health-checks the new
runtime. Aveletter's one email worker is updated with its backend. Other sites
remain running. Active AveStudio photo jobs block a backend replacement until
they finish.

If the off-host backup is too old, keep the Windows receiver running, start
a fresh transfer and wait for its successful status before deploying:

```powershell
ssh -t -F .\ops\ssh.conf avestudio-production "sudo systemctl start --no-block avestudio-production-backup.service"
```

From `D:\Web\avestudio`, inspect it with:

```powershell
python .\infrastructure\migration-2026-11-09\backup-bridge.py --status
```

The adapter files in `ops/production_*.py` record the host-mounted production
configuration. CI tests them, and backend activation checks their hashes against
the installed version. A change to those files requires a reviewed configuration
release; editing a copy inside an image does not replace the host mount.

## Everyday updates

Work normally in the appropriate folder. For example, for an Aveletter UI edit:

```powershell
Set-Location D:\Web\aveletter
git status
git diff
git add -- frontend/app/layout.tsx
git commit -m "Describe the change"
git push origin main
gh run list --workflow release.yml --branch main --limit 5
gh run watch
$releaseCommit = git rev-parse HEAD
python .\ops\deploy.py plan --commit $releaseCommit
python .\ops\deploy.py deploy --commit $releaseCommit
```

Replace the example `git add` path with the files you actually changed.
Uncommitted local edits are not part of a GitHub release. Use pull requests
instead of direct main pushes whenever you want a separate review before the
release build. Both routes still require an explicit deployment command.

For a frontend-only release, avoid restarting the backend:

```powershell
python .\ops\deploy.py plan --commit $releaseCommit --service frontend
python .\ops\deploy.py deploy --commit $releaseCommit --service frontend
```

Backend-only releases use `--service backend`. Normally deploy both together
when their API contract changes. Never run multiple deployment commands in
parallel; the VPS helper serializes its releases with a global lock.

## Health failure and rollback

For code-only failures during activation, the helper restores the prior image
references/configuration and retains the current database/media. To undo the
most recent successful code-only release later:

```powershell
python .\ops\deploy.py rollback
```

Once a schema migration begins, the helper deliberately leaves a failed release
in maintenance for repair; it does not restore an older database or assume the
old image supports the changed schema. The displayed root-only log identifies
the release. Preserve the database, media and mail, and inspect the failure.

Do not run migration-era staging installers for an ordinary release. Do not
use `docker compose down -v`, broad image pruning, or source snapshot restoration
as deployment steps. Previous images and per-release dumps are retained for
recovery; cleanup is a separate reviewed operation.

To inspect a failed GitHub build:

```powershell
gh run list --workflow release.yml --limit 5
gh run view RUN_ID --log-failed
```

Replace `RUN_ID` with the numeric ID shown by `gh run list`.

Official references: [publishing Docker images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images),
[private registry authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry),
[running workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

## Private R2 for new school photos

R2 support is disabled by default. It applies to new school originals, web images,
thumbnails and face-reference portraits. Existing school paths stay local. Client
albums, Google-linked albums, portfolio images and QR codes retain their current
storage. No bulk migration is performed.

1. In Cloudflare **R2 object storage**, open **avestudio-schools** and keep
   **Standard** storage and public access disabled. Its verified S3 endpoint uses
   the **default jurisdiction**, so the commands below specify that explicitly.
   Leave the r2.dev endpoint and custom public domains disabled.
2. In R2 **Manage API tokens**, create an **Object Read & Write** token scoped only
   to that bucket. Keep its Access Key ID and Secret Access Key in your private
   credential store. The configuration command prompts locally; do not paste
   keys into chat, source code or GitHub Actions secrets.
3. From the project virtual environment, install the small, pinned SDK tool set:

   ~~~powershell
   Set-Location D:\Web\avestudio
   python -m pip install --require-hashes -r .\ops\r2-requirements.lock
   python .\ops\configure_school_r2.py --jurisdiction default
   ~~~

   Enter the Cloudflare **account ID** and R2 keys when prompted. This bucket's
   endpoint is https://ACCOUNT_ID.r2.cloudflarestorage.com. This performs a
   write/read/delete check using one uniquely named temporary object, then lists
   bucket usage. It does not alter server settings.
4. After any current deployment finishes, save the verified configuration:

   ~~~powershell
   python .\ops\configure_school_r2.py --apply --jurisdiction default
   ~~~

   This repeats the access check and prompts for the VPS sudo password. It uses
   the deployment lock, selects the active backend environment file from the known
   production or legacy staging credential locations, preserves
   unrelated settings, and keeps a root-only backup before atomically writing
   the R2 variables. Keys travel through SSH stdin and are not saved on the PC.
   No containers are restarted. A running deployment prevents this change.
   For a separately created EU-jurisdiction bucket, use **--jurisdiction eu**.
   A European location hint is separate from an EU jurisdiction.
5. Deploy a successful backend release containing the R2 code and the additive
   **schools.0005_optional_r2_photo_storage** migration through the normal plan and
   deploy workflow. Review the plan and use **--migrate** for that schema change.
   The next backend container reads the saved configuration and starts new school
   photo writes in R2. No frontend or host-mounted production adapter change is
   needed for this feature.

The bucket stays private. The existing child PIN flow authorizes each photo path
before a 60-second R2 GET URL is issued. Reference portraits require an active staff
session. Browser CORS rules are unnecessary for server uploads and image redirects.
To stop new R2 writes, set **SCHOOLS_R2_ENABLED=false** and redeploy the backend;
keep its R2 credentials configured so existing R2 images remain readable.

Inside the deployed backend, **python manage.py check_school_r2 --probe --usage**
checks access and reports the bucket's object count and stored bytes. It does not
print credentials and removes only its own temporary probe object.

Cloudflare's free Standard allowance is **10 GB-month/month**, **1 million Class A**
operations and **10 million Class B** operations per account. Egress is free.
This is an allowance rather than a hard spending/storage cap: original files,
web versions, thumbnails and references all count, together with other buckets
in the account. The application does not promise zero charges or automatically
delete photos to control usage. Existing VPS backups cover the database and local
media; R2 object backups need their own copy.

Official references: [R2 pricing](https://developers.cloudflare.com/r2/pricing/),
[bucket jurisdiction](https://developers.cloudflare.com/r2/reference/data-location/),
[R2 API tokens](https://developers.cloudflare.com/r2/api/tokens/).

## Download all older Client album originals

Run this later from the PC when the deployment has finished:

~~~powershell
Set-Location D:\Web\avestudio
python .\ops\download_client_albums.py --destination D:\PhotoArchive\ClientAlbums --plan
python .\ops\download_client_albums.py --destination D:\PhotoArchive\ClientAlbums
~~~

Choose any destination with enough free space. Each command prompts locally for
the VPS sudo password; it is never stored or placed in command arguments. The
script uses the existing SSH config and known-host verification. It sends the
read-only exporter to the running backend in memory, so it also works before this
export feature has been deployed to the server.

Only **ClientAlbum/AlbumImage** originals are indexed, including every album
currently listed in **Client albums**. Google Drive/Google Photos linked albums,
school albums, QR codes and thumbnails are excluded. No Google API is called and
no image is copied to R2. Source photos and database rows are never deleted or
changed. Photos added after the index starts are picked up on the next run.

**--plan** hashes the server's originals and shows the total size without downloading
photo contents. The export creates a folder per album, adds IDs to distinguish
repeated names and writes **client-albums-export.json** with original names, source
keys and SHA-256 checksums. PINs and credentials are excluded from the manifest.

The transfer streams directly over SSH, with no large ZIP/TAR file created on the
VPS. Each photo is verified before becoming a final local file. Running the same
command again hashes the source and skips verified local copies, so interruptions
can be resumed. A changed source gets its own checksum-specific filename. Existing
conflicting local files are not overwritten. Missing/unreadable originals produce
an incomplete manifest and a nonzero exit status instead of a false success.
