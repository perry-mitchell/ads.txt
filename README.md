# ads.txt
> Ads.txt parser

[![Build Status](https://travis-ci.org/perry-mitchell/ads.txt.svg?branch=master)](https://travis-ci.org/perry-mitchell/ads.txt) [![npm version](https://badge.fury.io/js/ads.txt.svg)](https://www.npmjs.com/package/ads.txt)

Parse ads.txt file contents, according to the [IAB OpenRTB Ads.txt Public Spec](https://iabtechlab.com/wp-content/uploads/2017/09/IABOpenRTB_Ads.txt_Public_Spec_V1-0-1.pdf).

_**Note**: There may be some minor descrepencies between this implementation and the spec, but the `ads.txt` package does aim to be 100% in-line with the spec. Please file an issue if you notice any problems!_

## About
Ads.txt files are used by publishers to list their advertising partners that run ads on their sites. For instance, this is the top section of the `ads.txt` file on `cnn.com`:

```
 # CNN.com/ads.txt
 # 
 # DOMESTIC
google.com, pub-7439281311086140, DIRECT, f08c47fec0942fa0 # banner, video, native
rubiconproject.com, 11078, DIRECT, 0bfd66d529a55807 # banner, video
c.amazon-adsystem.com, 3159, DIRECT # banner, video
openx.com, 537153334, DIRECT # banner
appnexus.com, 7745, DIRECT # banner, video
kargo.com, 105, DIRECT # banner
```

## Installation
Simply `npm` install the package:

```shell
npm install ads.txt --save
```

## Usage
Import the parsing method and pass the contents of an `ads.txt` file to it:

```javascript
const { parseAdsTxt } = require("ads.txt");

const { variables, fields } = parseAdsTxt(someAdsTxtContent);
```

`parseAdsTxt` outputs an object with `variables` (Object) and `fields` (Array).

`variables` may resemble the following:

```json
{
    "subdomain": ["divisionone.example.com", "divisiontwo.example.com"],
    "contact": "Jane Doe"
}
```

Each field item in the `fields` array corresponds with a parsed `ads.txt` line:

```json
{
    "domain": "openx.com",
    "publisherAccountID": "343560932",
    "accountType": "DIRECT",
    "certificateAuthorityID": "38f6ae102b"
}
```

The `parseAdsText` function takes an options object (`parseAdsTxt(contents, options)`) that takes the following properties:

| Property            | Range              | Default      | Description                                                             |
|---------------------|--------------------|--------------|-------------------------------------------------------------------------|
| invalidLineAction   | "filter" / "throw" | "filter"     | Action to take when an invalid line is found. "throw" throws an exception, "filter" removes the line and continues on. |
