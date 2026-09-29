# Project Architecture

- Lovable publishing builds only the `client` workspace; the Express server is deployed separately through Docker, avoiding unsupported backend work during the hosted frontend build.