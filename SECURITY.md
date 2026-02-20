# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please:

1. **Do not** open a public GitHub issue
2. Email the maintainers directly at [noorabdo5577@gmail.com]
3. Include a detailed description of the vulnerability
4. Provide steps to reproduce the issue
5. Suggest a fix if possible

We will acknowledge receipt within 48 hours and provide a more detailed response within 7 days.

## Security Best Practices

When using this template:

### Environment Variables

- Never commit `.env` files to version control
- Use strong, unique secrets in production
- Rotate secrets periodically
- Use a secret manager for production deployments

### Authentication

- Always use HTTPS in production
- Keep JWT secrets long and random (32+ characters)
- Set appropriate token expiration times
- Implement rate limiting (enabled by default)

### Database

- Use strong database passwords
- Enable SSL connections in production
- Run migrations instead of using `synchronize: true`
- Regularly backup your database

### Dependencies

- Keep dependencies up to date
- Use `npm audit` to check for vulnerabilities
- Enable Dependabot for automated updates
