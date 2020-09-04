'use strict';
const Jimp = require('jimp');
const imgur = require('imgur');
const fetch = require('node-fetch');
const qs = require('querystring');
const AWS = require("aws-sdk");
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const lambda = new AWS.Lambda({
  region: "us-east-1"
});

module.exports.carcinization = async (event, context) => {
  let postData = qs.parse(event.body);
  console.log(postData);
  let test = await lambda.invoke({
    FunctionName: `xkcd-carcinization-slack-dev-slack_post`,
    InvocationType: 'Event',
    Payload: JSON.stringify(postData)
  }).promise();
  console.log(test);
  return {
    statusCode: 200
  }
};

module.exports.slackPost = async (postData) => {
  let args = postData.text.split(' ');

  if (args.length !== 3) throw new Error('invalid arguments');

  // capitalize
  args[0] = args[0].toUpperCase();
  args[1] = args[1].toUpperCase();

  // this callback hell sucks, but I'm unsure how to make lambda return a 200 immediately,
  // callback wasn't working.
  let font = await Jimp.loadFont('./xkcd.fnt')
  let overlayImg = await Jimp.read(args[2])
  overlayImg.contain(100,151,Jimp.HORIZONTAL_ALIGN_RIGHT | Jimp.VERTICAL_ALIGN_BOTTOM);
  let imageCode = '/tmp/' + uuidv4() + '.jpg';
  await Jimp.read('./carcinization.png').then((image) => {
    console.log(args);
    let comicText1 = `"${args[0]}"`
    let comicText2 = `${args[1]}S`
    let comicText3 = `"${args[1]}"`
    image
      .print(
        font,
        getCenteredTextPositioning(font, comicText1, 90),
        27,
        comicText1
      )
      .print(
        font,
        getCenteredTextPositioning(font, comicText2, 120),
        93,
        comicText2
      )
      .print(
        font,
        getCenteredTextPositioning(font, comicText3, 192),
        25,
        comicText3
      )
      .print(
        font,
        getCenteredTextPositioning(font, comicText3, 229),
        131,
        comicText2
      )
      .composite(
        overlayImg,
        638,
        140
      )
      .write(imageCode);
      
  });
  imgur.setClientId(process.env.IMGUR_CLIENT_ID);
  let upload = await imgur.uploadFile(imageCode);
  await fetch(postData.response_url,{
    method: 'POST',
    body: JSON.stringify({
      response_type: "in_channel",
      blocks: [
        {
          type: "image",
          title: {
            type: "plain_text",
            text: `${postData.user_name}: /carcinization ${postData.text}`,
            emoji: true
          },
          image_url: `${upload.data.link}`,
          alt_text: "carcinization meme"
        }
      ]
    })
  });
}




const getCenteredTextPositioning = (font, text, x) => {
  let width = Jimp.measureText(font, text);
  return x - (width / 2);
}

//112 160