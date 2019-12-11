# owngf

> Own google font using puppeteer

## Install

```
npm i -g owngf
```

## Usage

```
owngf [options]

Options:
  -f, --font <type>         Font you want to own (required)
  -w --weights <type>       Comma separated font weights (default: "400")
  -c --css-dir <type>       Dir to output [font].css (default: "./")
  -d --download-dir <type>  Dir to download [font] (default: "./")
  -h, --help                output usage information
```

## Example

```
owngf -f "Roboto" -w "400,700" -c ./styles -d ./assets/fonts
```
[Result](https://codesandbox.io/s/adoring-dawn-w13lt)
