<!-- Please provide a concise title and a short summary of the changes in this PR -->

### Summary
- Brief description of changes:

### Related Issue
- Resolves: # (link issue)

### Changes
- List of major changes and files modified.

### Checklist
- [ ] Tests added/updated or existing tests still pass (`make test`).
- [ ] Linting & formatting checked (`npm run lint` and `composer test` / `pint`).
- [ ] Updated docs where necessary (README, CONTRIBUTING, Swagger/OpenAPI).
- [ ] Database migrations included (if applicable) and seeders updated.
- [ ] No sensitive changes to `public/config.js` runtime token `__API_URL__` removed.
- [ ] PR is ready for review and has a meaningful description for maintainers.

### Merge
> IMPORTANT: Squash & merge is required for this project to keep a clean history.
- [ ] I will squash commits and reword the final commit message into a single logical message or use GitHub "Squash and merge".

### Verification steps / How to test locally
- Provide steps to test the changes locally. E.g.:
  ```bash
  make build-image
  cd docker
  docker compose -f docker/docker-compose.yml -f docker/docker-compose.override.yml up -d --build
  make test
  ```

Thank you for contributing!
