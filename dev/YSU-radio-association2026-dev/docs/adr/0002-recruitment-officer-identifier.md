# Use `recruitment-officer` as the code-level identifier for 招新负责人

The canonical Chinese role is **招新负责人** (the person responsible for running the association's recruitment). The obvious English code identifier would be `admin`, but that term is too broad: it can mean a system administrator, a superuser, or any backend operator.

We chose `recruitment-officer` because it is precise and tied to the recruitment domain. It makes the role's boundary explicit: this person manages the membership-application lifecycle and the admission-results workflow, not general system administration.

This decision is hard to reverse once API paths, JWT claims, and frontend fetch calls depend on it, and a future reader might reasonably expect `/api/admin` to exist.

## Consequences

- API base path: `/api/recruitment-officers`
- Login route: `POST /api/recruitment-officers/login`
- Authentication dependency: `get_current_recruitment_officer`
- The login page URL remains `admin-login.html` because it is a short, user-facing path that the association already uses.
