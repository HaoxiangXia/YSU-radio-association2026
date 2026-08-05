# Use `membership_application` as the English identifier for 入会申请

The recruitment domain has settled on `入会申请` as the canonical Chinese term, rejecting `报名`, `报名信息`, and `registration`. When this concept must be represented in English in code, database tables, and API paths, we chose `membership_application` over `application`.

`application` is too broad in a university context — it can mean a job application, a software application, or a course application. `membership_application` makes the domain boundary explicit: this is an application to become a member of the association. It also avoids the ambiguity that caused the original codebase to leak `registration` everywhere.

This decision is hard to reverse once the database, API clients, and frontend paths depend on it, and a future reader might reasonably wonder why we did not simply reuse `registration` or the shorter `application`.
