# Twilio SMS

You can utilize the [Twilio](https://www.twilio.com/) API to communicate in all sorts of ways with your customers. Mainly though, using SMS messaging will you get the best value.

## Setup Twilio

First go to [Twilio](https://www.twilio.com/) and create an account, probably starting with their free trial. Next, to send out SMS messages with Twilio they will provide us with a phone number that we can use, in the middle of page we should have access to a Getting a Phone Number step cycle.

## Getting and utilizing the Phone Number

When first using Twilio there should be a section in the main console. Otherwise,
you may have to [Buy](https://console.twilio.com/us1/develop/phone-numbers/manage/search?frameUrl=%2Fconsole%2Fphone-numbers%2Fsearch%3Fx-target-region%3Dus1&currentFrameUrl=%2Fconsole%2Fphone-numbers%2Fsearch%3FisoCountry%3DUS%26searchTerm%3D%26searchFilter%3Dleft%26searchType%3Dnumber%26x-target-region%3Dus1%26__override_layout__%3Dembed%26bifrost%3Dtrue) a number from that link to begin using it. Assuming this is the first run though, utilize the free number given to us. Simply follow one of their many [Tutorials](https://www.twilio.com/docs/usage/requests-to-twilio) within their docs to understand every part of the process.

In short, no matter the language you prefer the process is the same. Load the Account SID and Auth token into the code, using some sort of safe environment such as .env variables. Nobody should have access to this but you. Create a client object from Twilio that take the SID and Token as variables then create a message with the client. The message is an object that has three things; that free number from earlier, the number you would like to send to, and a body message that you want to send through SMS.

## Create a Twilio integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate **Twilio** and click on the **Connect** button.
- Go to your [Console](https://console.twilio.com/) on Twilio and access the Account Info section at the bottom of the page
- Enter your `Account SID`, `Auth Token` and `Twilio Phone Number`.
- Click on the **Save** button.
- You should now be able to send SMS notifications using **Twilio** in Novu.
