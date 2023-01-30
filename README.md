# TAM Velomagg puller

This repository contains the code that is used to pulled the dataset for the dataset that can be found on the repository https://github.com/BrokenSwing/tam-velomagg-dataset.

## How does it work ?

Each second, we're pulling the data from [the realtime API](https://www.data.gouv.fr/fr/datasets/disponibilite-en-temps-reel-des-velos-en-libre-service-velomagg-de-montpellier/) then store it in a PostgreSQL database.

Once a day, we export the data from the database to the repository linked above.

## Contributing

Contributions are welcomed if you need anything but I would prefer you reaching out to me first to understand your needs.

You can either reach using Github issues or through one of my coordinates you can find on my Github profile.

## Setting up locally

Run the following commands:

```
git clone https://github.com/BrokenSwing/tam-velomagg-puller
cd tam-velomagg-puller
npm install
echo "GITHUB_TOKEN=not_a_token" > local.env
# With docker compose v2
docker compose up -d
# or docker compose v1
docker-compose up -d
npm start
```

With the above setup, your local setup won't push the data to the Github repository.
If you want to setup this too, you need to create a [PAT](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token#creating-a-fine-grained-personal-access-token) with the permissions to write on a repository you own. Furthermore, you'll have to update the code as currently it is configured to push on the repository I chose and I didn't add a variable to configure that.
