# MobileCode

A mobile client for OpenCode.

<div align="center">
  <table>
    <tr>
      <td><img src="screenshots/mc_1.PNG" width="250" alt="Screenshot 1" /></td>
      <td><img src="screenshots/mc_2.PNG" width="250" alt="Screenshot 2" /></td>
    </tr>
    <tr>
      <td><img src="screenshots/mc_3.PNG" width="250" alt="Screenshot 3" /></td>
      <td><img src="screenshots/mc_4.PNG" width="250" alt="Screenshot 4" /></td>
    </tr>
  </table>
</div>

## Setup

It's only runnable by pairing it with the Expo Go app for now. I might publish it to TestFlight in the near future.

You need [opencode-tunneler](https://github.com/AYM1607/opencode-tunneler) on the machine where you're running OpenCode.
Run it on a directory you want to access through MobileCode and scan the resulting QR code from the projects screen.

IMPORTANT: I host an instance of [godig](https://github.com/AYM1607/godig) at godig.xyz. It's what allows proxying your local opencode server publicly.
You can either host your own instance (there's a fly.toml on the repo if you're okay with using fly.io) or reach out to me for an API key.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

3. Scan the QR code on your phone with Expo Go
