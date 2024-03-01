read -p "Enter the name of the client: " CLIENT_ID

if [ -z "$CLIENT_ID" ]
then
	echo "Error! Client name must not be empty. Press any key to exit."
else
	KEY=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c64)
	OUTPUT=$(sed "1a\ \ \ \ \"${KEY}\": \"${CLIENT_ID}\"," < clients.json)
	echo "${OUTPUT}" > clients.json
	echo "Client ${CLIENT_ID} added! Press any key to exit."
fi

read -n 1