module Book exposing (Book, Goodreads, ViewOptions, decode, toImageUrl, view, wrapWithParens)

import Dict
import Head.Seo exposing (book)
import Html
import Html.Attributes
import Json.Decode
import Route
import Serializer.Json.Extra


type alias Book =
    { id : Int
    , slug : String
    , title : String
    , author : Author
    , year : Int
    , imageUrl : Maybe String
    , goodreads : Maybe Goodreads
    }


type alias Author =
    { id : Int, name : String, slug : String, lifeSpan : Maybe String }


type alias Goodreads =
    { avgRating : Float
    , ratings : Int
    , bookUrl : String
    }


imageHostToUrl : Dict.Dict String String
imageHostToUrl =
    Dict.fromList
        [ ( "tomasgift"
          , "https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/tomasgift/libris-bib/{ID}/{ID}/orginal"
          )
        , ( "digi", "https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/digi/libris-bib/{ID}/{ID}.jpg/orginal" )
        , ( "bokrondellen"
          , "https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/bokrondellen/isbn/{ID}/{ID}.jpg/orginal"
          )
        , ( "goodreads"
          , "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/{ID}._SX200_.jpg"
          )
        , ( "kb", "https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/kb/libris-bib/{ID}/{ID}/orginal" )
        ]


toImageUrl : String -> String -> Maybe String
toImageUrl host id =
    imageHostToUrl
        |> Dict.get host
        |> Maybe.map (String.replace "{ID}" id)


decode : Json.Decode.Decoder Book
decode =
    Json.Decode.succeed
        (\id slug title authorId authorName authorSlug lifeSpan year avgRating ratings bookUrl imageHost imageId ->
            { id = id
            , slug = slug
            , title = title
            , author = { id = authorId, name = authorName, slug = authorSlug, lifeSpan = lifeSpan }
            , year = year
            , imageUrl =
                Maybe.map2 toImageUrl imageHost imageId
                    |> Maybe.andThen identity
            , goodreads =
                Maybe.map3 Goodreads
                    avgRating
                    ratings
                    bookUrl
            }
        )
        |> Serializer.Json.Extra.andMap (Json.Decode.field "id" Json.Decode.int)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "slug" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "title" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "author_id" Json.Decode.int)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "author_name" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "author_slug" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "author_life_span" Json.Decode.string))
        |> Serializer.Json.Extra.andMap (Json.Decode.field "year" Json.Decode.int)
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "avg_rating" Json.Decode.float))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "ratings" Json.Decode.int))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "book_url" Json.Decode.string))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "image_host" Json.Decode.string))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "image_id" Json.Decode.string))


type alias ViewOptions =
    { linkToAuthor : Bool, linkToYear : Bool, linkToTitle : Bool }


view : ViewOptions -> Book -> Html.Html msg
view { linkToAuthor, linkToYear, linkToTitle } book =
    let
        titleLink =
            if linkToTitle then
                Html.a [ Html.Attributes.href (Route.toString (Route.Bok__Id___Slug_ { id = String.fromInt book.id, slug = book.slug })) ]

            else
                List.head >> Maybe.withDefault (Html.text "")

        image =
            titleLink
                [ Html.div [ Html.Attributes.class "book-cover" ]
                    (case book.imageUrl of
                        Just u ->
                            [ Html.img [ Html.Attributes.attribute "loading" "lazy", Html.Attributes.src u, Html.Attributes.alt <| "Omslag för " ++ book.title ] [] ]

                        Nothing ->
                            [ Html.text "Inget omslag hittades" ]
                    )
                ]
    in
    Html.article [ Html.Attributes.class "book-card", Html.Attributes.tabindex 0 ]
        [ image
        , Html.div [ Html.Attributes.class "book-info" ]
            [ Html.div [ Html.Attributes.class "book-details" ]
                [ titleLink [ Html.h3 [ Html.Attributes.class "book-title" ] [ Html.text book.title ] ]
                , bookAuthor linkToAuthor book.author
                ]
            , Html.hr [] []
            , Html.div [ Html.Attributes.class "book-meta" ]
                [ yearView book.year linkToYear
                , case book.goodreads of
                    Just r ->
                        if r.ratings > 0 then
                            Html.div [ Html.Attributes.class "book-rating" ]
                                [ Html.img [ Html.Attributes.class "rating-star", Html.Attributes.alt "rating icon", Html.Attributes.src "/star.svg" ] []
                                , Html.span [ Html.Attributes.class "rating-value" ] [ Html.text <| String.fromFloat r.avgRating ++ " (" ++ String.fromInt r.ratings ++ ")" ]
                                ]

                        else
                            Html.text ""

                    Nothing ->
                        Html.text ""
                ]
            ]
        ]


bookAuthor : Bool -> Author -> Html.Html msg
bookAuthor linkToAuthor { id, name, slug, lifeSpan } =
    let
        displayName =
            Html.text <| ([ Just name, wrapWithParens lifeSpan ] |> List.filterMap identity |> String.join " ")
    in
    if linkToAuthor then
        Html.a [ Html.Attributes.href (Route.toString (Route.Forfattare__Id___Namn_ { id = String.fromInt id, namn = slug })), Html.Attributes.class "book-author" ] [ displayName ]

    else
        Html.span [] [ displayName ]


wrapWithParens : Maybe String -> Maybe String
wrapWithParens =
    Maybe.map (\s -> "(" ++ s ++ ")")


yearView : Int -> Bool -> Html.Html msg
yearView year createLink =
    let
        y =
            Html.span [ Html.Attributes.class "book-year" ] [ Html.text <| String.fromInt year ]
    in
    if createLink then
        Html.a [ Html.Attributes.href (Route.toString (Route.Ar__Tal_ { tal = String.fromInt year })) ] [ y ]

    else
        y
