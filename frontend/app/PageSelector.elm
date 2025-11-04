module PageSelector exposing (..)

import Html
import Html.Attributes
import Route


{-| Shows a page selector with links for [first page, two lower than current, current, two higher than current, last]
-}
view : Int -> Int -> ({ sida : String } -> Route.Route) -> Html.Html msg
view currentPage amountOfPages baseUrl =
    let
        from =
            Basics.max 2 (currentPage - 2)

        to =
            Basics.min (amountOfPages - 1) (currentPage + 2)
    in
    Html.div [ Html.Attributes.class "page-selector" ]
        (1
            :: List.range from to
            ++ [ amountOfPages ]
            |> List.map
                (\page ->
                    if page == currentPage then
                        Html.span [] [ Html.text <| String.fromInt page ]

                    else
                        Html.a
                            [ Html.Attributes.href (Route.toString (baseUrl { sida = String.fromInt page })) ]
                            [ Html.text <| String.fromInt page ]
                )
        )
