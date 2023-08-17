---
sidebar_position: 3
sidebar_label: Subscribers Migration
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Subscribers Migration

## Types of Migration

### Full Sync

1. Usually done in the early stages
2. CRON-based or Data (CSV) based
3. Syncs everything before moving into production
4. Mandatory for the usage of Topics (because only existing subscribers can be added to the topic)

### Differential Sync

1. [Ahead of Trigger](../platform/subscribers.md#1-ahead-of-trigger)
2. [Inline of Trigger](../platform/subscribers.md#2-inline-of-trigger)
3. Used to make sure data is updated and available
4. Easy to do

## Bulk subscribers migration using mock data CSV file

Here, `mock_data.csv` file is a CSV file having mock data. The below script will read this CSV file and create a new subscriber in Novu. Change example variables values like `API_KEY` value with your valid values. Download `mock_data.csv` file from [here](/csv/mock_data.csv).

:::info
`mock_data.csv` file should be in the same directory of script
:::

<Tabs groupId="language" queryString>
  <TabItem value="bash" label="Shell Script">

```shell title='script.sh'
#!/bin/bash

# Change these variables with your own values
CSV_FILE="mock_data.csv"
API_ENDPOINT="https://api.novu.co/v1/subscribers"
API_KEY="ApiKey <API_KEY>"

OLDIFS=$IFS
IFS=','
[ ! -f $CSV_FILE ] && { echo "$CSV_FILE file not found"; exit 99; }

SECONDS=0

# Read the CSV file line by line
while read subscriberId firstName lastName email phone locale avatar
do
    # Check if subscriberId is empty or not present
    if [[ -z "$subscriberId" ]]; then
        echo "Skipping row with missing subscriberId"
        continue
    fi

    # Construct the JSON body for the POST request
    json_body="{\"subscriberId\": \"$subscriberId\""

    # Add optional fields to the JSON body if present
    if [[ -n "$firstName" ]]; then
        json_body="$json_body, \"firstName\": \"$firstName\""
    fi

    if [[ -n "$lastName" ]]; then
        json_body="$json_body, \"lastName\": \"$lastName\""
    fi

    if [[ -n "$email" ]]; then
        # Validate email using regex
        if [[ ! "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
            echo "Invalid email format for subscriberId: $subscriberId"
            continue
        fi
        json_body="$json_body, \"email\": \"$email\""
    fi

    if [[ -n "$phone" ]]; then
        json_body="$json_body, \"phone\": \"$phone\""
    fi

    if [[ -n "$locale" ]]; then
        # Validate locale using regex
        if [[ ! "$locale" =~ ^[a-zA-Z]{2}(-[a-zA-Z]{2})?$ ]]; then
            echo "Invalid locale format for subscriberId: $subscriberId"
            continue
        fi
        json_body="$json_body, \"locale\": \"$locale\""
    fi

    if [[ -n "$avatar" ]]; then
        json_body="$json_body, \"avatar\": \"$avatar\""
    fi

    if [[ -n "$address" || -n "$job" ]]; then
        json_body="$json_body, \"data\": {"

        if [[ -n "$address" ]]; then
            json_body="$json_body \"address\": \"$address\""
        else
            json_body="$json_body \"address\": \"\""
        fi

        if [[ -n "$job" ]]; then
            json_body="$json_body, \"job\": \"$job\""
        else
            json_body="$json_body, \"job\": \"\""
        fi

        json_body="$json_body }"
    fi

    json_body="$json_body}"

    echo $json_body

    #Send the cURL POST request with the JSON body and handle exceptions
    response=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: $API_KEY" -d "$json_body" -w "%{http_code}" "$API_ENDPOINT")

    http_code=${response:${#response}-3}

    if [[ $http_code -eq 201 ]]; then
        echo "cURL request successful for subscriberId: $subscriberId - HTTP Status Code: $http_code"
    else
        echo "cURL request failed for subscriberId: $subscriberId - HTTP Status Code: $http_code - response : $response"
    fi

done < "$CSV_FILE"

ELAPSED="Time Elapsed: $(($SECONDS / 3600))hrs $((($SECONDS / 60) % 60))min $(($SECONDS % 60))sec"

echo $ELAPSED
```

  </TabItem>

  <TabItem value="js" label="Node.js">

```javascript
import { Novu } from '@novu/node';
require('dotenv').config();

const csv = require('csv-parser');
const fs = require('fs');

const novu = new Novu('<NOVU_API_KEY>');

fs.createReadStream('mock_data.csv')
  .pipe(csv())
  .on('data', async (data) => {
    let subscriber = await novu.subscribers.identify(data.subscriberId, {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      avatar: data.avatar,
      locale: data.locale,
      data: { address: data.address, job: data.job },
    });

    console.log(subscriber.data);
  })
  .on('end', () => {
    console.log('done');
  });
```

  </TabItem>

  <TabItem value="dotnet" label=".Net">

```csharp
using System;
using System.IO;
using System.Text;
using System.Linq;
using Novu.DTO;
using Novu.Models;
using Novu;

class Program
{
    static async Task Main()
    {
        var novuConfiguration = new NovuClientConfiguration
            {
                ApiKey = "<NOVU_API_KEY>",
            };

        var novu = new NovuClient(novuConfiguration);

        string filePath = "./mock_data.csv"; // Replace with the actual path to your CSV file

        await MigrateFromCSV(filePath, novu);
    }

    async static Task MigrateFromCSV(string filePath, NovuClient novu)
    {
        try
        {
            string[] lines = File.ReadAllLines(filePath, Encoding.UTF8);

            var myTasks = lines.Select(async line =>
            {
                await ProcessLine(line, novu);
            });

            await Task.WhenAll(myTasks);

            Console.WriteLine("All lines processed successfully.");
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error: " + ex.Message);
        }
    }

    async static Task ProcessLine(string line, NovuClient novu)
    {

        string[] data = line.Split(",");

        var additionalData = new List<AdditionalDataDto>
        {
        new AdditionalDataDto
        {
            Key = "Address",
            Value = data[7]
        },
        new AdditionalDataDto
        {
            Key = "Job",
            Value = data[8]
        }
        };

        var newSubscriberDto = new CreateSubscriberDto
        {
        SubscriberId = data[0],
        FirstName = data[1],
        LastName = data[2],
        Email = data[3],
        Phone = data[4],
        Locale = data[5],
        Avatar = data[6],
        Data = additionalData
        };

        var subscriber = await novu.Subscriber.CreateSubscriber(newSubscriberDto);
        Console.WriteLine("added " +  subscriber.Email);
    }
}
```

  </TabItem>
</Tabs>

### Steps:-

1. Export your user details in CSV format.
2. Clean this exported CSV file. Keep only relevant fields.
3. Move this CSV file to the script directory.
4. Change the file name in the script with your file name.
5. Run the script. (Make script.sh executable before using)
