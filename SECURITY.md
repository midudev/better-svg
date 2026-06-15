# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Better SVG, please report it by:

1. **Email**: Send details to hi@midu.dev
2. **GitHub**: Use the [private vulnerability reporting](https://github.com/midudev/better-svg/security/advisories/new) feature

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work on a fix as soon as possible.

## Security Measures

This extension:

- Does not collect or transmit user data
- Does not make external network requests (except for SVGO optimization, which runs locally)
- Uses VS Code's Content Security Policy for webviews
- Is open source and can be audited at https://github.com/midudev/better-svg
- All code is non-obfuscated and readable

## License

This extension is licensed under Apache License 2.0. See [LICENSE](LICENSE) file for details.
