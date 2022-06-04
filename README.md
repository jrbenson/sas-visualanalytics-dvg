# SAS Visual Analytics Data-Driven Content Dynamic SVG

This project provides a SAS Visual Analytics (VA) data-driven content object that uses annotations on provided data and SVG file to create a dynamic illustration that responds to data updates. It is a wrapper around the [Dyanmic Vector Graphics](https://github.com/jrbenson/dynamic-vector-graphics#readme) project.

## Quick Start Guide

To use this system in a Visual Analytics report you must use a Data-driven content object.

**_Adding a Data-driven Content Object_**
![](doc/va-ddc-addobject.gif)

Then you must provide a URL to the VA Data-driven Content object's "URL" option. This URL should point to a copy of the `index.html` file in this project. This `index.html` page uses URL parameter syntax for an `svg` parameter which in turn provides a URL to the desired SVG file. This sample URL uses a test SVG to demonstrate:

```
https://jrbenson.github.io/sas-visualanalytics-dvg/?svg=https://jrbenson.github.io/dvg-gallery/svg/test/airplane-top.svg
```

**_Setting URL of VA Data-driven Content_**
![](doc/va-ddc-urlentry.gif)

If you host a copy of the library alongside your SVGs then the path can be relative, such as `https://my.host.com/dvg/dvg.html?svg=graphic.svg`

If you cannot host your own copy of the page then either unpkg or GitHub pages host the `index.html` page as well:

```
https://unpkg.com/sas-visualanalytics-dvg/index.html
```

```
https://jrbenson.github.io/sas-visualanalytics-dvg/
```

Any measures in the data that will be used to dynamically alter the SVG need to be annotated with their minimum to maximum data range using the syntax `{{MIN..MAX}}`.

**_Adding Range Annotation to Data_**
![](doc/va-data-datarange.gif)

And finally the data must be assigned to the "Variables" role of the Data-driven content object.

**_Adding Range Annotation to Data_**
![](doc/va-ddc-roleassign.gif)

## Annotating an SVG File

To make your an SVG file dynamic it must be correctly annotated. Information on the annotation syntax may be found on the [Dyanmic Vector Graphics](https://github.com/jrbenson/dynamic-vector-graphics#readme) project.
