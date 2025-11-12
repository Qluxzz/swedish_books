module PageSelector exposing (..)

import Html
import Html.Attributes
import Route


{-| Shows a page selector with links for [first page, two lower than current, current, two higher than current, last]
-}
view : Int -> Int -> (String -> Route.Route) -> Html.Html msg
view currentPage amountOfPages baseUrl =
    let
        range =
            if amountOfPages == 1 then
                [ currentPage ]

            else
                let
                    from =
                        Basics.max 2 (currentPage - 2)

                    to =
                        Basics.min (amountOfPages - 1) (currentPage + 2)
                in
                (1 :: List.range from to) ++ [ amountOfPages ]
    in
    Html.div [ Html.Attributes.class "page-selector" ]
        (range
            |> List.map
                (\page ->
                    if page == currentPage then
                        Html.span [] [ Html.text <| String.fromInt page ]

                    else
                        Html.a
                            [ Html.Attributes.href (Route.toString (baseUrl (String.fromInt page))) ]
                            [ Html.text <| String.fromInt page ]
                )
        )
