# Use a persistent minimal record for membership-application deletion

The recruitment domain now persists a minimal SQLite operation record after each successful membership-application deletion. The record keeps the deletion time, recruitment-officer identifier, operation, application ID, pre-deletion name, and student ID, but not a full application snapshot, so the deletion remains traceable without extending retention of phone, email, self-introduction, or expectation data; records are manually cleaned in the same approved retention batch as application data.
